"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  CheckCircle,
  XCircle,
  FileText,
  CalendarDays,
  Clock,
  User,
  Building2,
  RefreshCw,
  Eye,
  X,
  Loader2,
  MessageSquare,
} from "lucide-react";

type LeaveRequest = {
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
  staff_name: string;
  staff_id: string;
  email: string;
  department: string;
  position: string;
  leave_type: string;
  evidence_url?: string;
};

export default function DirectorApprovalsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("Director");
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(
    null,
  );
  const [decision, setDecision] = useState<"Approved" | "Rejected" | null>(
    null,
  );
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
        .eq("status", "Pending")
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

      const profileRows = profiles || [];
      const typeRows = leaveTypes || [];

      const departmentIds = [
        ...new Set(profileRows.map((p) => p.department_id).filter(Boolean)),
      ];

      const { data: departments, error: departmentsError } =
        departmentIds.length
          ? await supabase
              .from("departments")
              .select("id, name")
              .in("id", departmentIds)
          : { data: [], error: null };

      if (departmentsError) throw departmentsError;

      const enriched: LeaveRequest[] = await Promise.all(
        rows.map(async (request) => {
          const staff = profileRows.find((p) => p.id === request.user_id);
          const type = typeRows.find((t) => t.id === request.leave_type_id);
          const department = (departments || []).find(
            (d) => d.id === staff?.department_id,
          );

          let evidence_url: string | undefined;

          if (request.attachment_url) {
            const { data: signedData } = await supabase.storage
              .from("leave-approval-evidence")
              .createSignedUrl(request.attachment_url, 3600);

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
    } catch (err: any) {
      console.error("Error loading approval requests:", err);
      setError(err.message || "Unable to load leave applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const openDecision = (
    request: LeaveRequest,
    selectedDecision: "Approved" | "Rejected",
  ) => {
    setSelectedRequest(request);
    setDecision(selectedDecision);
    setComment("");
    setError("");
    setSuccess("");
  };

  const submitDecision = async () => {
    if (!selectedRequest || !decision) return;

    if (!comment.trim()) {
      setError("Please enter a decision comment before continuing.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "director_decide_leave",
        {
          p_request_id: selectedRequest.id,
          p_status: decision,
          p_comment: comment.trim(),
        },
      );

      if (rpcError) throw rpcError;

      if (!data?.success) {
        throw new Error("The decision could not be completed.");
      }

      setSuccess(`Application ${decision.toLowerCase()} successfully.`);
      setSelectedRequest(null);
      setDecision(null);
      setComment("");

      await loadRequests();
    } catch (err: any) {
      console.error("Decision error:", err);
      setError(err.message || "Unable to submit your decision.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <DashboardLayout role="director" fullName={fullName}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#326536]">
              Director's Office
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#172033]">
              Leave Approvals
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Review applications and make official leave decisions.
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

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {success}
          </div>
        )}

        {error && !selectedRequest && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Awaiting your decision</p>
              <p className="mt-1 text-3xl font-bold text-[#172033]">
                {requests.length}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <Clock size={25} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center rounded-2xl bg-white p-12">
            <Loader2 className="animate-spin text-[#326536]" size={30} />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white px-6 py-14 text-center shadow-sm">
            <CheckCircle className="mx-auto text-green-600" size={42} />
            <h3 className="mt-4 text-lg font-semibold text-gray-800">
              No pending applications
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              All submitted leave applications have been reviewed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Pending Review
                      </span>
                      <span className="text-xs text-gray-400">
                        Submitted {formatDate(request.created_at.slice(0, 10))}
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

                    <p className="line-clamp-2 text-sm text-gray-600">
                      <strong>Reason:</strong> {request.reason}
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Eye size={16} />
                        View Details
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

                  <div className="flex gap-2 lg:w-44 lg:flex-col">
                    <button
                      onClick={() => openDecision(request, "Approved")}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#326536] px-4 py-3 text-sm font-semibold text-white hover:bg-[#28522b]"
                    >
                      <CheckCircle size={17} />
                      Approve
                    </button>

                    <button
                      onClick={() => openDecision(request, "Rejected")}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                      <XCircle size={17} />
                      Reject
                    </button>
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
                  Leave Application Details
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedRequest.staff_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setDecision(null);
                  setError("");
                }}
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
                <p className="text-xs font-semibold text-gray-500">
                  Acting Person
                </p>
                <p className="mt-1 text-sm text-gray-800">
                  {selectedRequest.acting_person || "Not specified"}
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
                  <p className="mt-2 text-sm text-red-600">
                    No evidence attachment found.
                  </p>
                )}
              </div>

              <div className="border-t pt-5">
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <MessageSquare size={17} />
                  Decision Comment
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="Enter your reason for approving or rejecting this application..."
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#326536] focus:ring-2 focus:ring-[#326536]/10"
                />

                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

                <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    onClick={() => {
                      setSelectedRequest(null);
                      setDecision(null);
                      setError("");
                    }}
                    disabled={submitting}
                    className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  {decision && (
                    <button
                      onClick={submitDecision}
                      disabled={submitting || !comment.trim()}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 ${
                        decision === "Approved"
                          ? "bg-[#326536] hover:bg-[#28522b]"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {submitting ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : decision === "Approved" ? (
                        <CheckCircle size={17} />
                      ) : (
                        <XCircle size={17} />
                      )}
                      Confirm {decision}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
