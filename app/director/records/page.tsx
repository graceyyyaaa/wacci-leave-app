"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Search,
  RefreshCw,
  FileText,
  CalendarDays,
  Building2,
  Eye,
  X,
  Loader2,
  Download,
  Filter,
} from "lucide-react";

type LeaveRecord = {
  id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  return_date: string;
  total_days: number;
  reason: string;
  acting_person: string | null;
  attachment_url: string | null;
  status: string;
  admin_comment: string | null;
  created_at: string;
  updated_at: string;
  staff_name: string;
  staff_id: string;
  email: string;
  department: string;
  position: string;
  leave_type: string;
  evidence_url?: string;
};

export default function DirectorRecordsPage() {
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [fullName, setFullName] = useState("Director");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [selectedRecord, setSelectedRecord] = useState<LeaveRecord | null>(
    null,
  );
  const [error, setError] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (profileError || profile?.role?.toLowerCase() !== "director") {
        window.location.href = "/login";
        return;
      }

      setFullName(profile.full_name || "Director");

      const { data: leaveData, error: leaveError } = await supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (leaveError) throw leaveError;

      const rows = leaveData || [];

      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const leaveTypeIds = [...new Set(rows.map((r) => r.leave_type_id))];

      const [
        { data: profiles, error: profilesError },
        { data: leaveTypes, error: typesError },
      ] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("*").in("id", userIds)
          : Promise.resolve({ data: [], error: null }),
        leaveTypeIds.length
          ? supabase.from("leave_types").select("*").in("id", leaveTypeIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (profilesError) throw profilesError;
      if (typesError) throw typesError;

      const departmentIds = [
        ...new Set(
          (profiles || []).map((p) => p.department_id).filter(Boolean),
        ),
      ];

      const { data: departments, error: departmentsError } =
        departmentIds.length
          ? await supabase
              .from("departments")
              .select("id, name")
              .in("id", departmentIds)
          : { data: [], error: null };

      if (departmentsError) throw departmentsError;

      const enriched: LeaveRecord[] = await Promise.all(
        rows.map(async (request) => {
          const staff = (profiles || []).find((p) => p.id === request.user_id);
          const type = (leaveTypes || []).find(
            (t) => t.id === request.leave_type_id,
          );
          const department = (departments || []).find(
            (d) => d.id === staff?.department_id,
          );

          let evidence_url: string | undefined;

          if (request.attachment_url) {
            const { data: signedData, error: signedError } =
              await supabase.storage
                .from("leave-approval-evidence")
                .createSignedUrl(request.attachment_url, 3600);

            if (signedError) {
              console.error("Evidence link error:", signedError);
            }

            evidence_url = signedData?.signedUrl;
          }

          return {
            ...request,
            staff_name: staff?.full_name || "Unknown Staff",
            staff_id: staff?.staff_id || "N/A",
            email: staff?.email || "N/A",
            department: department?.name || "N/A",
            position: staff?.position || "N/A",
            leave_type: type?.name || "Leave",
            evidence_url,
          };
        }),
      );

      setRecords(enriched);
    } catch (err: any) {
      console.error("Director records error:", err);
      setError(err.message || "Unable to load staff leave records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const departments = useMemo(
    () => [...new Set(records.map((r) => r.department))].sort(),
    [records],
  );

  const filteredRecords = useMemo(() => {
    const term = search.toLowerCase().trim();

    return records.filter((record) => {
      const matchesSearch =
        record.staff_name.toLowerCase().includes(term) ||
        record.staff_id.toLowerCase().includes(term) ||
        record.email.toLowerCase().includes(term) ||
        record.department.toLowerCase().includes(term) ||
        record.leave_type.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "All" || record.status === statusFilter;

      const matchesDepartment =
        departmentFilter === "All" || record.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [records, search, statusFilter, departmentFilter]);

  const stats = {
    total: records.length,
    pending: records.filter((r) => r.status === "Pending").length,
    approved: records.filter((r) => r.status === "Approved").length,
    rejected: records.filter((r) => r.status === "Rejected").length,
  };

  const formatDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const exportCSV = () => {
    if (!filteredRecords.length) return;

    const headers = [
      "Staff Name",
      "Staff ID",
      "Email",
      "Department",
      "Position",
      "Leave Type",
      "Start Date",
      "Return Date",
      "Total Days",
      "Reason",
      "Acting Person",
      "Status",
      "Director Comment",
      "Application Date",
      "Decision Date",
    ];

    const escapeCSV = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csvRows = filteredRecords.map((r) =>
      [
        r.staff_name,
        r.staff_id,
        r.email,
        r.department,
        r.position,
        r.leave_type,
        r.start_date,
        r.return_date,
        r.total_days,
        r.reason,
        r.acting_person,
        r.status,
        r.admin_comment,
        r.created_at,
        r.updated_at,
      ]
        .map(escapeCSV)
        .join(","),
    );

    const csv = [headers.map(escapeCSV).join(","), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "WACCI-Director-Leave-Records.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout role="director" fullName={fullName}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#326536]">
              Director's Office
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#172033]">
              Staff Leave Records
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Complete overview of all staff leave applications and decisions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadRecords}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              onClick={exportCSV}
              disabled={!filteredRecords.length}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#326536] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#28522b] disabled:opacity-50"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Applications",
              value: stats.total,
              color: "text-[#172033]",
            },
            {
              label: "Pending",
              value: stats.pending,
              color: "text-amber-600",
            },
            {
              label: "Approved",
              value: stats.approved,
              color: "text-green-700",
            },
            {
              label: "Rejected",
              value: stats.rejected,
              color: "text-red-600",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className={`mt-2 text-3xl font-bold ${stat.color}`}>
                {loading ? "..." : stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff, ID, department or leave type..."
              className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#326536]"
            />
          </div>

          <div className="relative lg:w-48">
            <Filter
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#326536]"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="relative lg:w-52">
            <Building2
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#326536]"
            >
              <option value="All">All Departments</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center rounded-2xl bg-white p-12">
            <Loader2 className="animate-spin text-[#326536]" size={30} />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
            <FileText className="mx-auto text-gray-400" size={40} />
            <h3 className="mt-4 font-semibold text-gray-800">
              No leave records found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <div>
                <h2 className="font-bold text-[#172033]">
                  All Leave Applications
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Showing {filteredRecords.length} of {records.length} records
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-4">Staff Member</th>
                    <th className="px-5 py-4">Department</th>
                    <th className="px-5 py-4">Leave Type</th>
                    <th className="px-5 py-4">Leave Period</th>
                    <th className="px-5 py-4">Days</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Details</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-800">
                          {record.staff_name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {record.staff_id}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {record.department}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {record.leave_type}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                        {formatDate(record.start_date)} to{" "}
                        {formatDate(record.return_date)}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {record.total_days}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            record.status === "Approved"
                              ? "bg-green-50 text-green-700"
                              : record.status === "Rejected"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                        >
                          <Eye size={15} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white p-5">
              <div>
                <h2 className="text-lg font-bold text-[#172033]">
                  Leave Record Details
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedRecord.staff_name}
                </p>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500">Staff ID</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {selectedRecord.staff_id}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {selectedRecord.department}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="mt-1 break-all font-semibold text-gray-800">
                    {selectedRecord.email}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Position</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {selectedRecord.position}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Leave Type</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {selectedRecord.leave_type}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {selectedRecord.total_days} days
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Start Date</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {formatDate(selectedRecord.start_date)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Return Date</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {formatDate(selectedRecord.return_date)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Application Date</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {formatDate(selectedRecord.created_at.slice(0, 10))}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {formatDate(selectedRecord.updated_at.slice(0, 10))}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500">Reason</p>
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                  {selectedRecord.reason}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500">
                  Director's Decision Comment
                </p>
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                  {selectedRecord.admin_comment || "No comment recorded."}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500">
                  University of Ghana Approval Evidence
                </p>

                {selectedRecord.evidence_url ? (
                  <a
                    href={selectedRecord.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 rounded-xl border border-[#326536]/20 bg-[#326536]/5 p-3 text-sm font-semibold text-[#326536]"
                  >
                    <FileText size={18} />
                    Open attached evidence
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">
                    No evidence attachment found.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
