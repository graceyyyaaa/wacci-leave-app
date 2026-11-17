"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  FileText,
  CalendarDays,
  MessageSquare,
  Eye,
  X,
  Loader2,
  Building2,
  Filter,
  Clock,
} from "lucide-react";

type ReviewedRequest = {
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

export default function DirectorReviewedPage() {
  const [requests, setRequests] = useState<ReviewedRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ReviewedRequest[]>(
    [],
  );
  const [fullName, setFullName] = useState("Director");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedRequest, setSelectedRequest] =
    useState<ReviewedRequest | null>(null);
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
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
        .in("status", ["Approved", "Rejected"])
        .order("updated_at", { ascending: false });

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

      const enriched = await Promise.all(
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

      setRequests(enriched);
      setFilteredRequests(enriched);
    } catch (err: any) {
      console.error("Reviewed requests error:", err);
      setError(err.message || "Unable to load reviewed applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const term = search.toLowerCase().trim();

    const filtered = requests.filter((request) => {
      const matchesSearch =
        request.staff_name.toLowerCase().includes(term) ||
        request.staff_id.toLowerCase().includes(term) ||
        request.department.toLowerCase().includes(term) ||
        request.leave_type.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "All" || request.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    setFilteredRequests(filtered);
  }, [search, statusFilter, requests]);

  const formatDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const approvedCount = requests.filter((r) => r.status === "Approved").length;

  const rejectedCount = requests.filter((r) => r.status === "Rejected").length;

  return (
    <DashboardLayout role="director" fullName={fullName}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#326536]">
              Director's Office
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#172033]">
              Reviewed Requests
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View the history of all leave decisions made by the Director.
            </p>
          </div>

          <button
            onClick={loadRequests}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved Applications</p>
                <p className="mt-2 text-3xl font-bold text-[#326536]">
                  {loading ? "..." : approvedCount}
                </p>
              </div>
              <div className="rounded-xl bg-green-50 p-3 text-green-700">
                <CheckCircle size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rejected Applications</p>
                <p className="mt-2 text-3xl font-bold text-red-600">
                  {loading ? "..." : rejectedCount}
                </p>
              </div>
              <div className="rounded-xl bg-red-50 p-3 text-red-600">
                <XCircle size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff, department or leave type..."
              className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#326536]"
            />
          </div>

          <div className="relative sm:w-52">
            <Filter
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#326536]"
            >
              <option value="All">All Decisions</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
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
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
            <FileText className="mx-auto text-gray-400" size={40} />
            <h3 className="mt-4 font-semibold text-gray-800">
              No reviewed applications found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try changing your search or decision filter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                          request.status === "Approved"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {request.status === "Approved" ? (
                          <CheckCircle size={13} />
                        ) : (
                          <XCircle size={13} />
                        )}
                        {request.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        Decided {formatDate(request.updated_at.slice(0, 10))}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-[#172033]">
                        {request.staff_name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {request.staff_id} · {request.position}
                      </p>
                    </div>

                    <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 size={16} className="text-[#326536]" />
                        {request.department}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FileText size={16} className="text-[#326536]" />
                        {request.leave_type}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <CalendarDays size={16} className="text-[#326536]" />
                        {request.total_days} days
                      </div>
                    </div>

                    <p className="text-sm text-gray-600">
                      <strong>Period:</strong> {formatDate(request.start_date)}{" "}
                      to {formatDate(request.return_date)}
                    </p>

                    <p className="text-sm text-gray-600">
                      <strong>Director's decision comment:</strong>{" "}
                      {request.admin_comment || "No comment recorded"}
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Eye size={16} />
                        View Full Details
                      </button>

                      {request.evidence_url && (
                        <a
                          href={request.evidence_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-[#326536]/20 bg-[#326536]/5 px-3 py-2 text-sm font-semibold text-[#326536] hover:bg-[#326536]/10"
                        >
                          <FileText size={16} />
                          View UG Evidence
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white p-5">
              <div>
                <h2 className="text-lg font-bold text-[#172033]">
                  Reviewed Application Details
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedRequest.staff_name}
                </p>
              </div>

              <button
                onClick={() => setSelectedRequest(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div
                className={`rounded-xl p-4 ${
                  selectedRequest.status === "Approved"
                    ? "bg-green-50"
                    : "bg-red-50"
                }`}
              >
                <p className="text-xs font-semibold text-gray-500">
                  Final Decision
                </p>
                <p
                  className={`mt-1 text-lg font-bold ${
                    selectedRequest.status === "Approved"
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {selectedRequest.status}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Decision date:{" "}
                  {formatDate(selectedRequest.updated_at.slice(0, 10))}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Recorded by: {selectedRequest.acting_person || fullName}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500">Staff ID</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {selectedRequest.staff_id}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {selectedRequest.department}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="mt-1 break-all font-semibold text-gray-800">
                    {selectedRequest.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Position</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {selectedRequest.position}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Leave Type</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {selectedRequest.leave_type}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {selectedRequest.total_days} days
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Start Date</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {formatDate(selectedRequest.start_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Return Date</p>
                  <p className="mt-1 font-semibold text-gray-800">
                    {formatDate(selectedRequest.return_date)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500">Reason</p>
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                  {selectedRequest.reason}
                </p>
              </div>

              <div>
                <p className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                  <MessageSquare size={15} />
                  Director's Decision Comment
                </p>
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                  {selectedRequest.admin_comment || "No comment recorded."}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500">
                  University of Ghana Approval Evidence
                </p>
                {selectedRequest.evidence_url ? (
                  <a
                    href={selectedRequest.evidence_url}
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
