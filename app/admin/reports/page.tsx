"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  CalendarDays,
  Loader2,
  BarChart3,
  PieChart,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";

type LeaveRequest = {
  id: string;
  user_id: string;
  leave_type_id: string | null;
  start_date: string;
  return_date: string;
  total_days: number;
  reason: string;
  status: string | null;
  created_at: string | null;
};

type Profile = {
  id: string;
  department_id: string | null;
};

type Department = {
  id: string;
  name: string;
};

type LeaveType = {
  id: string;
  name: string;
};

type ReportRecord = LeaveRequest & {
  staffName: string;
  staffId: string;
  departmentName: string;
  leaveTypeName: string;
};

const COLORS = {
  green: "#326536",
  lime: "#C4DD5A",
  yellow: "#D69E00",
  red: "#DC2626",
  blue: "#3B82F6",
};

export default function AdminReportsPage() {
  const router = useRouter();

  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("Administrator");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      router.replace("/login");
      return;
    }

    const role = String(profile.role).toLowerCase();

    if (role !== "admin") {
      router.replace(role === "director" ? "/director" : "/dashboard");
      return;
    }

    setFullName(profile.full_name || "Administrator");
    await loadReports();
  }

  async function loadReports() {
    setLoading(true);

    try {
      const [
        { data: requests, error: requestError },
        { data: profiles, error: profileError },
        { data: departments, error: departmentError },
        { data: leaveTypes, error: typeError },
      ] = await Promise.all([
        supabase
          .from("leave_requests")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("profiles")
          .select("id, full_name, staff_id, department_id"),

        supabase.from("departments").select("id, name"),

        supabase.from("leave_types").select("id, name"),
      ]);

      if (requestError) throw requestError;
      if (profileError) throw profileError;
      if (departmentError) throw departmentError;
      if (typeError) throw typeError;

      const profileMap = new Map(
        (profiles || []).map(
          (
            profile: Profile & {
              full_name: string;
              staff_id: string;
            },
          ) => [profile.id, profile],
        ),
      );

      const departmentMap = new Map(
        (departments || []).map((department: Department) => [
          department.id,
          department.name,
        ]),
      );

      const leaveTypeMap = new Map(
        (leaveTypes || []).map((type: LeaveType) => [type.id, type.name]),
      );

      const formatted: ReportRecord[] = (requests || []).map(
        (request: LeaveRequest) => {
          const person = profileMap.get(request.user_id);

          return {
            ...request,
            staffName: person?.full_name || "Unknown Staff",
            staffId: person?.staff_id || "Not available",
            departmentName: person?.department_id
              ? departmentMap.get(person.department_id) || "Not assigned"
              : "Not assigned",
            leaveTypeName: request.leave_type_id
              ? leaveTypeMap.get(request.leave_type_id) || "Unknown Leave Type"
              : "Not specified",
          };
        },
      );

      setRecords(formatted);
    } catch (error) {
      console.error("Reports loading error:", error);

      toast.error(
        error instanceof Error ? error.message : "Could not load reports.",
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const submittedDate = record.created_at?.slice(0, 10) || "";

      if (startDate && (!submittedDate || submittedDate < startDate)) {
        return false;
      }

      if (endDate && (!submittedDate || submittedDate > endDate)) {
        return false;
      }

      return true;
    });
  }, [records, startDate, endDate]);

  const stats = useMemo(() => {
    const total = filteredRecords.length;

    const pending = filteredRecords.filter(
      (record) => (record.status || "Pending").toLowerCase() === "pending",
    ).length;

    const approved = filteredRecords.filter(
      (record) => (record.status || "").toLowerCase() === "approved",
    ).length;

    const rejected = filteredRecords.filter(
      (record) => (record.status || "").toLowerCase() === "rejected",
    ).length;

    const totalDays = filteredRecords.reduce(
      (sum, record) => sum + (record.total_days || 0),
      0,
    );

    return { total, pending, approved, rejected, totalDays };
  }, [filteredRecords]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();

    filteredRecords.forEach((record) => {
      if (!record.created_at) return;

      const date = new Date(record.created_at);

      const month = date.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      });

      map.set(month, (map.get(month) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([month, count]) => ({ month, count }))
      .reverse()
      .slice(-12);
  }, [filteredRecords]);

  const departmentData = useMemo(() => {
    const map = new Map<string, number>();

    filteredRecords.forEach((record) => {
      map.set(record.departmentName, (map.get(record.departmentName) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  const leaveTypeData = useMemo(() => {
    const map = new Map<string, number>();

    filteredRecords.forEach((record) => {
      map.set(record.leaveTypeName, (map.get(record.leaveTypeName) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  function exportCSV() {
    if (filteredRecords.length === 0) {
      toast.error("There are no records to export.");
      return;
    }

    const headers = [
      "Staff Name",
      "Staff ID",
      "Department",
      "Leave Type",
      "Start Date",
      "Return Date",
      "Total Days",
      "Reason",
      "Status",
      "Submission Date",
    ];

    const rows = filteredRecords.map((record) => [
      record.staffName,
      record.staffId,
      record.departmentName,
      record.leaveTypeName,
      record.start_date,
      record.return_date,
      record.total_days,
      record.reason,
      record.status || "Pending",
      record.created_at || "",
    ]);

    const escapeCSV = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `WACCI_Leave_Report_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Report exported successfully.");
  }

  function clearFilters() {
    setStartDate("");
    setEndDate("");
  }

  const maxMonthly = Math.max(...monthlyData.map((item) => item.count), 1);

  const maxDepartment = Math.max(
    ...departmentData.map((item) => item.count),
    1,
  );

  const maxLeaveType = Math.max(...leaveTypeData.map((item) => item.count), 1);

  return (
    <DashboardLayout role="admin" fullName={fullName}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => router.push("/admin")}
              className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#326536]"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>

            <h1 className="text-2xl font-bold text-gray-900">
              Reports & Analytics
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Monitor WACCI staff leave activities and management statistics.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadReports}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={exportCSV}
              disabled={loading || filteredRecords.length === 0}
              className="flex items-center gap-2 rounded-xl bg-[#326536] px-4 py-3 text-sm font-semibold text-white hover:bg-[#254d29] disabled:opacity-50"
            >
              <Download size={17} />
              Export Report
            </button>
          </div>
        </div>

        {/* Date Filters */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={19} className="text-[#326536]" />
            <h2 className="font-bold text-gray-900">Report Period</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-600">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#326536]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-600">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#326536]"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Clear Date Filters
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Filters use the application submission date.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl bg-white py-20 text-gray-500">
            <Loader2 size={22} className="mr-2 animate-spin" />
            Loading reports...
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryCard
                title="Total Applications"
                value={stats.total}
                icon={<FileText size={23} />}
                color="blue"
              />

              <SummaryCard
                title="Pending"
                value={stats.pending}
                icon={<Clock size={23} />}
                color="yellow"
              />

              <SummaryCard
                title="Approved"
                value={stats.approved}
                icon={<CheckCircle2 size={23} />}
                color="green"
              />

              <SummaryCard
                title="Rejected"
                value={stats.rejected}
                icon={<XCircle size={23} />}
                color="red"
              />

              <SummaryCard
                title="Total Leave Days"
                value={stats.totalDays}
                icon={<CalendarDays size={23} />}
                color="lime"
              />
            </div>

            {/* Monthly Analysis */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-xl bg-green-50 p-3 text-[#326536]">
                  <BarChart3 size={22} />
                </div>

                <div>
                  <h2 className="font-bold text-gray-900">
                    Monthly Leave Applications
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Applications submitted per month.
                  </p>
                </div>
              </div>

              {monthlyData.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="space-y-5">
                  {monthlyData.map((item) => (
                    <div
                      key={item.month}
                      className="grid grid-cols-[85px_1fr_35px] items-center gap-3"
                    >
                      <span className="text-sm text-gray-600">
                        {item.month}
                      </span>

                      <div className="h-4 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-[#326536] transition-all"
                          style={{
                            width: `${(item.count / maxMonthly) * 100}%`,
                            minWidth: "5px",
                          }}
                        />
                      </div>

                      <span className="text-right text-sm font-semibold text-gray-700">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Department and Leave Type Analysis */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-xl bg-green-50 p-3 text-[#326536]">
                    <Building2 size={22} />
                  </div>

                  <div>
                    <h2 className="font-bold text-gray-900">
                      Department Analysis
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Applications by department.
                    </p>
                  </div>
                </div>

                {departmentData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <div className="space-y-5">
                    {departmentData.map((item) => (
                      <div key={item.name}>
                        <div className="mb-2 flex justify-between gap-3">
                          <span className="text-sm text-gray-700">
                            {item.name}
                          </span>
                          <span className="text-sm font-semibold text-gray-800">
                            {item.count}
                          </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-[#326536]"
                            style={{
                              width: `${(item.count / maxDepartment) * 100}%`,
                              minWidth: "5px",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="rounded-xl bg-lime-50 p-3 text-[#326536]">
                    <PieChart size={22} />
                  </div>

                  <div>
                    <h2 className="font-bold text-gray-900">
                      Leave Type Analysis
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Applications by leave category.
                    </p>
                  </div>
                </div>

                {leaveTypeData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <div className="space-y-5">
                    {leaveTypeData.map((item) => (
                      <div key={item.name}>
                        <div className="mb-2 flex justify-between gap-3">
                          <span className="text-sm text-gray-700">
                            {item.name}
                          </span>
                          <span className="text-sm font-semibold text-gray-800">
                            {item.count}
                          </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-[#C4DD5A]"
                            style={{
                              width: `${(item.count / maxLeaveType) * 100}%`,
                              minWidth: "5px",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Detailed Department Summary */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-gray-900">Department Summary</h2>

              <p className="mt-1 text-sm text-gray-500">
                Breakdown of application status by department.
              </p>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[650px] text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                      <th className="px-4 py-4">Department</th>
                      <th className="px-4 py-4">Total</th>
                      <th className="px-4 py-4">Pending</th>
                      <th className="px-4 py-4">Approved</th>
                      <th className="px-4 py-4">Rejected</th>
                    </tr>
                  </thead>

                  <tbody>
                    {departmentData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-sm text-gray-500"
                        >
                          No department data available.
                        </td>
                      </tr>
                    ) : (
                      departmentData.map((department) => {
                        const departmentRecords = filteredRecords.filter(
                          (record) => record.departmentName === department.name,
                        );

                        const pending = departmentRecords.filter(
                          (record) =>
                            (record.status || "Pending").toLowerCase() ===
                            "pending",
                        ).length;

                        const approved = departmentRecords.filter(
                          (record) =>
                            (record.status || "").toLowerCase() === "approved",
                        ).length;

                        const rejected = departmentRecords.filter(
                          (record) =>
                            (record.status || "").toLowerCase() === "rejected",
                        ).length;

                        return (
                          <tr
                            key={department.name}
                            className="border-b border-gray-50 last:border-0"
                          >
                            <td className="px-4 py-4 font-semibold text-gray-800">
                              {department.name}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-700">
                              {department.count}
                            </td>
                            <td className="px-4 py-4 text-sm text-amber-600">
                              {pending}
                            </td>
                            <td className="px-4 py-4 text-sm text-green-700">
                              {approved}
                            </td>
                            <td className="px-4 py-4 text-sm text-red-600">
                              {rejected}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Recent Applications */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-gray-900">
                Recent Leave Applications
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Latest applications within the selected report period.
              </p>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[750px] text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                      <th className="px-4 py-4">Staff Member</th>
                      <th className="px-4 py-4">Department</th>
                      <th className="px-4 py-4">Leave Type</th>
                      <th className="px-4 py-4">Duration</th>
                      <th className="px-4 py-4">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-12 text-center text-sm text-gray-500"
                        >
                          No leave applications available.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.slice(0, 10).map((record) => (
                        <tr
                          key={record.id}
                          className="border-b border-gray-50 last:border-0"
                        >
                          <td className="px-4 py-4">
                            <p className="font-semibold text-gray-800">
                              {record.staffName}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {record.staffId}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-sm text-gray-600">
                            {record.departmentName}
                          </td>

                          <td className="px-4 py-4 text-sm text-gray-600">
                            {record.leaveTypeName}
                          </td>

                          <td className="px-4 py-4 text-sm text-gray-600">
                            {record.total_days} days
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                (record.status || "Pending").toLowerCase() ===
                                "approved"
                                  ? "bg-green-50 text-green-700"
                                  : (
                                        record.status || "Pending"
                                      ).toLowerCase() === "rejected"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {record.status || "Pending"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "yellow" | "green" | "red" | "lime";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-amber-50 text-amber-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    lime: "bg-lime-50 text-[#326536]",
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>

        <div className={`rounded-xl p-3 ${styles[color]}`}>{icon}</div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center text-gray-400">
      <BarChart3 size={30} />
      <p className="mt-2 text-sm">No data available for this period.</p>
    </div>
  );
}
