"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  FileText,
  CalendarDays,
  Users,
  Download,
  Eye,
  X,
  Loader2,
  Paperclip,
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
  acting_person: string | null;
  attachment_url: string | null;
  status: string | null;
  admin_comment: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type StaffProfile = {
  id: string;
  full_name: string;
  staff_id: string;
  email: string;
  department_id: string | null;
  position: string;
};

type Department = {
  id: string;
  name: string;
};

type LeaveType = {
  id: string;
  name: string;
};

type RecordItem = LeaveRequest & {
  staffName: string;
  staffId: string;
  staffEmail: string;
  position: string;
  departmentName: string;
  leaveTypeName: string;
};

export default function AdminLeaveRecordsPage() {
  const router = useRouter();

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("Administrator");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("All");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);

  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceLoading, setEvidenceLoading] = useState(false);

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
    await loadRecords();
  }

  async function loadRecords() {
    setLoading(true);

    try {
      const [
        { data: requests, error: requestError },
        { data: staff, error: staffError },
        { data: departmentData, error: departmentError },
        { data: typeData, error: typeError },
      ] = await Promise.all([
        supabase
          .from("leave_requests")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("profiles")
          .select("id, full_name, staff_id, email, department_id, position"),

        supabase.from("departments").select("id, name"),

        supabase.from("leave_types").select("id, name"),
      ]);

      if (requestError) throw requestError;
      if (staffError) throw staffError;
      if (departmentError) throw departmentError;
      if (typeError) throw typeError;

      const staffMap = new Map(
        (staff || []).map((person: StaffProfile) => [person.id, person]),
      );

      const departmentMap = new Map(
        (departmentData || []).map((department: Department) => [
          department.id,
          department.name,
        ]),
      );

      const typeMap = new Map(
        (typeData || []).map((type: LeaveType) => [type.id, type.name]),
      );

      setDepartments(departmentData || []);
      setLeaveTypes(typeData || []);

      const formattedRecords: RecordItem[] = (requests || []).map(
        (request: LeaveRequest) => {
          const person = staffMap.get(request.user_id);

          return {
            ...request,
            staffName: person?.full_name || "Unknown Staff",
            staffId: person?.staff_id || "Not available",
            staffEmail: person?.email || "Not available",
            position: person?.position || "Not available",
            departmentName: person?.department_id
              ? departmentMap.get(person.department_id) || "Not assigned"
              : "Not assigned",
            leaveTypeName: request.leave_type_id
              ? typeMap.get(request.leave_type_id) || "Unknown Leave Type"
              : "Not specified",
          };
        },
      );

      setRecords(formattedRecords);
    } catch (error: unknown) {
      console.error("Leave records loading error:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Could not load leave records.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        record.staffName.toLowerCase().includes(searchValue) ||
        record.staffId.toLowerCase().includes(searchValue) ||
        record.staffEmail.toLowerCase().includes(searchValue) ||
        record.leaveTypeName.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "All" ||
        (record.status || "Pending").toLowerCase() ===
          statusFilter.toLowerCase();

      const matchesDepartment =
        departmentFilter === "All" ||
        record.departmentName === departmentFilter;

      const matchesLeaveType =
        leaveTypeFilter === "All" || record.leaveTypeName === leaveTypeFilter;

      return (
        matchesSearch && matchesStatus && matchesDepartment && matchesLeaveType
      );
    });
  }, [records, search, statusFilter, departmentFilter, leaveTypeFilter]);

  const pendingCount = records.filter(
    (record) => (record.status || "Pending").toLowerCase() === "pending",
  ).length;

  const approvedCount = records.filter(
    (record) => (record.status || "").toLowerCase() === "approved",
  ).length;

  const rejectedCount = records.filter(
    (record) => (record.status || "").toLowerCase() === "rejected",
  ).length;

  function formatDate(date: string | null) {
    if (!date) return "Not available";

    return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      },
    );
  }

  function formatDateTime(date: string | null) {
    if (!date) return "Not available";

    return new Date(date).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function statusStyle(status: string | null) {
    switch ((status || "Pending").toLowerCase()) {
      case "approved":
        return "bg-green-50 text-green-700";
      case "rejected":
        return "bg-red-50 text-red-700";
      default:
        return "bg-amber-50 text-amber-700";
    }
  }

  function exportCSV() {
    if (filteredRecords.length === 0) {
      toast.error("There are no records to export.");
      return;
    }

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
      "Date Submitted",
    ];

    const rows = filteredRecords.map((record) => [
      record.staffName,
      record.staffId,
      record.staffEmail,
      record.departmentName,
      record.position,
      record.leaveTypeName,
      record.start_date,
      record.return_date,
      record.total_days,
      record.reason,
      record.acting_person || "",
      record.status || "Pending",
      record.admin_comment || "",
      record.created_at || "",
    ]);

    const escapeCSV = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `WACCI_Leave_Records_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Leave records exported successfully.");
  }

  async function openRecord(record: RecordItem) {
    setSelectedRecord(record);
    setEvidenceUrl("");

    if (!record.attachment_url) return;

    setEvidenceLoading(true);

    try {
      const { data, error } = await supabase.storage
        .from("leave-approval-evidence")
        .createSignedUrl(record.attachment_url, 300);

      if (error) {
        console.error("Evidence access error:", error.message);
        toast.error("Could not access the supporting document.");
      } else {
        setEvidenceUrl(data.signedUrl);
      }
    } catch (error) {
      console.error("Evidence error:", error);
    } finally {
      setEvidenceLoading(false);
    }
  }

  return (
    <DashboardLayout role="admin" fullName={fullName}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => router.push("/admin")}
              className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#326536]"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>

            <h1 className="text-2xl font-bold text-gray-900">Leave Records</h1>

            <p className="mt-1 text-sm text-gray-500">
              View and monitor all staff leave applications and decisions.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadRecords}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
              Export Excel CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Applications"
            value={records.length}
            icon={<FileText size={23} />}
          />

          <SummaryCard
            title="Pending"
            value={pendingCount}
            icon={<CalendarDays size={23} />}
          />

          <SummaryCard
            title="Approved"
            value={approvedCount}
            icon={<Users size={23} />}
          />

          <SummaryCard
            title="Rejected"
            value={rejectedCount}
            icon={<FileText size={23} />}
          />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="font-bold text-gray-900">Application Records</h2>
            <p className="mt-1 text-sm text-gray-500">
              Search and filter leave applications across WACCI.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search staff or leave type..."
                className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-[#326536]"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#326536]"
            >
              <option value="All">All Departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.name}>
                  {department.name}
                </option>
              ))}
            </select>

            <select
              value={leaveTypeFilter}
              onChange={(event) => setLeaveTypeFilter(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#326536]"
            >
              <option value="All">All Leave Types</option>
              {leaveTypes.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#326536]"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="mt-5 flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {filteredRecords.length} of {records.length} applications
            </span>

            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("All");
                setDepartmentFilter("All");
                setLeaveTypeFilter("All");
              }}
              className="font-medium text-[#326536] hover:underline"
            >
              Clear filters
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <Loader2 size={20} className="mr-2 animate-spin" />
              Loading leave records...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <FileText size={35} className="mx-auto mb-3 text-gray-300" />
              <p className="font-semibold">No leave records found</p>
              <p className="mt-1 text-sm">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-4">Staff Member</th>
                    <th className="px-4 py-4">Department</th>
                    <th className="px-4 py-4">Leave Type</th>
                    <th className="px-4 py-4">Leave Period</th>
                    <th className="px-4 py-4">Days</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="px-4 py-5">
                        <p className="font-semibold text-gray-800">
                          {record.staffName}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {record.staffId}
                        </p>
                      </td>

                      <td className="px-4 py-5 text-sm text-gray-600">
                        {record.departmentName}
                      </td>

                      <td className="px-4 py-5 text-sm text-gray-700">
                        {record.leaveTypeName}
                      </td>

                      <td className="px-4 py-5 text-sm text-gray-600">
                        <p>{formatDate(record.start_date)}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          to {formatDate(record.return_date)}
                        </p>
                      </td>

                      <td className="px-4 py-5 text-sm font-semibold text-gray-700">
                        {record.total_days}
                      </td>

                      <td className="px-4 py-5">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyle(
                            record.status,
                          )}`}
                        >
                          {record.status || "Pending"}
                        </span>
                      </td>

                      <td className="px-4 py-5">
                        <button
                          onClick={() => openRecord(record)}
                          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-[#326536] hover:text-[#326536]"
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
          )}
        </div>

        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <div className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Leave Application Details
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Full information about this application.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedRecord(null);
                    setEvidenceUrl("");
                  }}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Staff Member</p>
                      <p className="mt-1 font-bold text-gray-900">
                        {selectedRecord.staffName}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {selectedRecord.staffId}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyle(
                        selectedRecord.status,
                      )}`}
                    >
                      {selectedRecord.status || "Pending"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DetailItem label="Email" value={selectedRecord.staffEmail} />
                  <DetailItem
                    label="Department"
                    value={selectedRecord.departmentName}
                  />
                  <DetailItem
                    label="Position"
                    value={selectedRecord.position}
                  />
                  <DetailItem
                    label="Leave Type"
                    value={selectedRecord.leaveTypeName}
                  />
                  <DetailItem
                    label="Start Date"
                    value={formatDate(selectedRecord.start_date)}
                  />
                  <DetailItem
                    label="Return Date"
                    value={formatDate(selectedRecord.return_date)}
                  />
                  <DetailItem
                    label="Total Days"
                    value={`${selectedRecord.total_days} days`}
                  />
                  <DetailItem
                    label="Acting Person"
                    value={selectedRecord.acting_person || "Not specified"}
                  />
                  <DetailItem
                    label="Submitted On"
                    value={formatDateTime(selectedRecord.created_at)}
                  />
                  <DetailItem
                    label="Last Updated"
                    value={formatDateTime(selectedRecord.updated_at)}
                  />
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-700">
                    Application Reason
                  </p>
                  <div className="rounded-xl border border-gray-200 p-4 text-sm leading-7 text-gray-700">
                    {selectedRecord.reason}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-700">
                    Director's Decision Comment
                  </p>
                  <div className="rounded-xl border border-gray-200 p-4 text-sm leading-7 text-gray-700">
                    {selectedRecord.admin_comment ||
                      "No decision comment recorded."}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-700">
                    Supporting Document
                  </p>

                  {!selectedRecord.attachment_url ? (
                    <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                      No supporting document attached.
                    </p>
                  ) : evidenceLoading ? (
                    <p className="flex items-center gap-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                      <Loader2 size={17} className="animate-spin" />
                      Preparing document...
                    </p>
                  ) : evidenceUrl ? (
                    <a
                      href={evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-[#326536] hover:bg-green-100"
                    >
                      <Paperclip size={18} />
                      Open Supporting Document
                    </a>
                  ) : (
                    <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
                      The supporting document could not be opened. Check the
                      storage permissions for this account.
                    </p>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs leading-6 text-gray-500">
                    This is a read-only administrative record. The Main Admin
                    cannot approve or reject leave applications. Leave decisions
                    are reserved for the Director.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedRecord(null);
                  setEvidenceUrl("");
                }}
                className="mt-6 w-full rounded-xl bg-[#326536] px-5 py-3 text-sm font-semibold text-white hover:bg-[#254d29]"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="rounded-xl bg-green-50 p-3 text-[#326536]">{icon}</div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800 break-words">
        {value}
      </p>
    </div>
  );
}
