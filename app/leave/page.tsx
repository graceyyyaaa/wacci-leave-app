"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  X,
  Eye,
  Loader2,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type LeaveType = {
  id: string;
  name: string;
};

type LeaveRequest = {
  id: string;
  user_id: string;
  leave_type_id: string | null;
  start_date: string;
  return_date: string;
  total_days: number;
  reason: string;
  status: string;
  admin_comment: string | null;
  acting_person: string | null;
  created_at: string;
  attachment_url: string | null;
  leave_types: {
    name: string;
  } | null;
};

const BUCKET = "leave-approval-evidence";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function LeavePage() {
  const router = useRouter();

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const totalDays = calculateDays(startDate, endDate);

  function calculateDays(start: string, end: string) {
    if (!start || !end) return 0;

    const startTime = new Date(`${start}T00:00:00`).getTime();
    const endTime = new Date(`${end}T00:00:00`).getTime();

    if (endTime < startTime) return 0;

    return Math.floor((endTime - startTime) / 86400000) + 1;
  }

  function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getStatusClass(status: string) {
    if (status === "Approved") {
      return "bg-green-100 text-green-700 border-green-200";
    }

    if (status === "Rejected") {
      return "bg-red-100 text-red-700 border-red-200";
    }

    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  }

  function getStatusMessage(status: string) {
    if (status === "Approved") {
      return "Your leave request has been approved.";
    }

    if (status === "Rejected") {
      return "Your leave request has been rejected.";
    }

    return "Your leave request is awaiting the Director's decision.";
  }

  async function loadLeaveTypes() {
    setLoadingTypes(true);

    try {
      const { data, error } = await supabase
        .from("leave_types")
        .select("id, name")
        .order("name");

      if (error) throw error;

      setLeaveTypes(data || []);
    } catch (error) {
      console.error("Leave types error:", error);
      toast.error("Unable to load leave types.");
    } finally {
      setLoadingTypes(false);
    }
  }

  async function loadMyRequests() {
    setLoadingRequests(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("leave_requests")
        .select(
          `
          id,
          user_id,
          leave_type_id,
          start_date,
          return_date,
          total_days,
          reason,
          status,
          admin_comment,
          acting_person,
          created_at,
          attachment_url,
          leave_types (
            name
          )
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRequests((data || []) as unknown as LeaveRequest[]);
    } catch (error) {
      console.error("My leave requests error:", error);
      toast.error("Unable to load your leave requests.");
    } finally {
      setLoadingRequests(false);
    }
  }

  useEffect(() => {
    loadLeaveTypes();
    loadMyRequests();
  }, []);

  function handleFileChange(file: File | null) {
    if (!file) {
      setAttachment(null);
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a JPG, PNG or PDF document.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must not exceed 10 MB.");
      return;
    }

    setAttachment(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!leaveTypeId) {
      toast.error("Please select a leave type.");
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please select your leave dates.");
      return;
    }

    if (endDate < startDate) {
      toast.error("Return date cannot be before the start date.");
      return;
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for your leave.");
      return;
    }

    if (!attachment) {
      toast.error(
        "Please attach your University of Ghana leave approval evidence.",
      );
      return;
    }

    if (totalDays <= 0) {
      toast.error("Please select valid leave dates.");
      return;
    }

    setLoading(true);

    let uploadedPath: string | null = null;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        toast.error("Your session has expired. Please login again.");
        router.push("/login");
        return;
      }

      // Create a unique and safe file name.
      const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, "_");

      const filePath = `${user.id}/${Date.now()}-${safeName}`;

      // Upload the approval evidence to private Supabase storage.
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, attachment, {
          cacheControl: "3600",
          upsert: false,
          contentType: attachment.type,
        });

      if (uploadError) throw uploadError;

      uploadedPath = filePath;

      // Save the leave application and evidence path.
      const { error: insertError } = await supabase
        .from("leave_requests")
        .insert({
          user_id: user.id,
          leave_type_id: leaveTypeId,
          start_date: startDate,
          return_date: endDate,
          total_days: totalDays,
          reason: reason.trim(),
          status: "Pending",
          attachment_url: filePath,
        });

      if (insertError) throw insertError;

      toast.success(
        "Leave application and approval evidence submitted successfully.",
      );

      setLeaveTypeId("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setAttachment(null);

      const fileInput = document.getElementById(
        "approvalEvidence",
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = "";

      await loadMyRequests();
    } catch (error) {
      console.error("Leave submission error:", error);

      // Remove the uploaded file if saving the application failed.
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage
          .from(BUCKET)
          .remove([uploadedPath]);

        if (cleanupError) {
          console.error("Evidence cleanup error:", cleanupError);
        }
      }

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to submit your leave application.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function viewEvidence(path: string) {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 300);

      if (error) throw error;

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Evidence viewing error:", error);
      toast.error("Unable to open your supporting document.");
    }
  }

  const pendingCount = requests.filter(
    (request) => request.status === "Pending",
  ).length;

  const approvedCount = requests.filter(
    (request) => request.status === "Approved",
  ).length;

  const rejectedCount = requests.filter(
    (request) => request.status === "Rejected",
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Page Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#326536]">
              Staff Portal
            </p>

            <h1 className="mt-2 text-4xl font-bold text-slate-900 md:text-5xl">
              Leave Management
            </h1>

            <p className="mt-3 text-lg text-slate-600">
              Apply for leave and track your leave requests.
            </p>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Status Summary */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-5">
            <div className="flex items-center gap-2 text-yellow-700">
              <Clock size={19} />
              <p className="text-sm font-medium">Pending</p>
            </div>
            <p className="mt-2 text-3xl font-bold text-yellow-700">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 size={19} />
              <p className="text-sm font-medium">Approved</p>
            </div>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {approvedCount}
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle size={19} />
              <p className="text-sm font-medium">Rejected</p>
            </div>
            <p className="mt-2 text-3xl font-bold text-red-700">
              {rejectedCount}
            </p>
          </div>
        </div>

        {/* Apply for Leave */}
        <div className="mb-10 rounded-3xl bg-white p-8 shadow-sm md:p-10">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900">
              Apply for Leave
            </h2>

            <p className="mt-2 text-slate-600">
              Complete the form below to submit a new leave request.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Leave Type */}
            <div>
              <label
                htmlFor="leaveType"
                className="mb-3 block text-lg font-medium text-slate-700"
              >
                Leave Type
              </label>

              <select
                id="leaveType"
                required
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                disabled={loadingTypes || loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-5 py-4 text-lg text-slate-900 outline-none transition focus:border-[#326536] focus:ring-2 focus:ring-green-100 disabled:bg-slate-100"
              >
                <option value="">
                  {loadingTypes
                    ? "Loading leave types..."
                    : "Select leave type"}
                </option>

                {leaveTypes.map((leaveType) => (
                  <option key={leaveType.id} value={leaveType.id}>
                    {leaveType.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div>
                <label
                  htmlFor="startDate"
                  className="mb-3 block text-lg font-medium text-slate-700"
                >
                  Start Date
                </label>

                <input
                  id="startDate"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 bg-white px-5 py-4 text-lg text-slate-900 outline-none focus:border-[#326536] focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="mb-3 block text-lg font-medium text-slate-700"
                >
                  Return Date
                </label>

                <input
                  id="endDate"
                  type="date"
                  required
                  min={startDate || undefined}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 bg-white px-5 py-4 text-lg text-slate-900 outline-none focus:border-[#326536] focus:ring-2 focus:ring-green-100"
                />
              </div>
            </div>

            {/* Number of Days */}
            <div className="rounded-2xl bg-blue-50 p-7">
              <p className="text-lg font-medium text-slate-700">
                Number of Days
              </p>

              <p className="mt-2 text-4xl font-bold text-blue-600">
                {totalDays} {totalDays === 1 ? "day" : "days"}
              </p>
            </div>

            {/* Reason */}
            <div>
              <label
                htmlFor="reason"
                className="mb-3 block text-lg font-medium text-slate-700"
              >
                Reason for Leave
              </label>

              <textarea
                id="reason"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={loading}
                placeholder="Enter the reason for your leave"
                rows={7}
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-5 py-4 text-lg text-slate-900 outline-none focus:border-[#326536] focus:ring-2 focus:ring-green-100"
              />
            </div>

            {/* Mandatory Approval Evidence */}
            <div>
              <label
                htmlFor="approvalEvidence"
                className="mb-3 block text-lg font-semibold text-slate-800"
              >
                University of Ghana Leave Approval Evidence
                <span className="ml-1 text-red-600">*</span>
              </label>

              <p className="mb-4 text-sm leading-6 text-slate-600">
                Attach an image or scanned copy of the document showing that
                your leave has been approved by the University of Ghana, Legon.
                This document is required before your application can be
                submitted.
              </p>

              <label
                htmlFor="approvalEvidence"
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#326536]/40 bg-green-50/50 px-6 py-10 text-center transition hover:border-[#326536] hover:bg-green-50"
              >
                <div className="mb-3 rounded-full bg-white p-4 text-[#326536] shadow-sm">
                  <Upload size={28} />
                </div>

                <span className="text-base font-semibold text-slate-800">
                  Click to upload your approval document
                </span>

                <span className="mt-2 text-sm text-slate-500">
                  JPG, JPEG, PNG or PDF. Maximum size: 10 MB.
                </span>

                <input
                  id="approvalEvidence"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                  required
                  disabled={loading}
                  onChange={(e) =>
                    handleFileChange(e.target.files?.[0] || null)
                  }
                  className="hidden"
                />
              </label>

              {attachment && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-lg bg-white p-3 text-[#326536]">
                      <FileText size={22} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {attachment.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(attachment.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setAttachment(null);
                      const input = document.getElementById(
                        "approvalEvidence",
                      ) as HTMLInputElement | null;
                      if (input) input.value = "";
                    }}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-100"
                    aria-label="Remove attachment"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}

              <p className="mt-3 text-xs text-slate-500">
                <span className="font-semibold text-red-600">Required:</span>{" "}
                Your application cannot be submitted without this document.
              </p>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-1 gap-5 pt-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                disabled={loading}
                className="rounded-xl border border-slate-300 bg-white px-6 py-4 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  loading || loadingTypes || !leaveTypeId || !attachment
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-[#326536] px-6 py-4 text-lg font-semibold text-white transition hover:bg-[#254d29] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Uploading and Submitting...
                  </>
                ) : (
                  "Submit Leave Request"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* My Leave Requests */}
        <div className="rounded-3xl bg-white p-8 shadow-sm md:p-10">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900">
              My Leave Requests
            </h2>

            <p className="mt-2 text-slate-600">
              Track the status of your submitted leave applications.
            </p>
          </div>

          {loadingRequests ? (
            <div className="rounded-2xl bg-slate-50 py-16 text-center">
              <Loader2
                className="mx-auto animate-spin text-[#326536]"
                size={28}
              />
              <p className="mt-3 text-slate-500">
                Loading your leave requests...
              </p>
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 py-16 text-center">
              <p className="text-xl font-semibold text-slate-700">
                No leave requests yet
              </p>

              <p className="mt-2 text-slate-500">
                Your submitted leave applications will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        Leave Type
                      </p>

                      <h3 className="mt-1 text-2xl font-bold text-slate-900">
                        {request.leave_types?.name || "Leave Request"}
                      </h3>
                    </div>

                    <span
                      className={`inline-flex w-fit rounded-full border px-4 py-2 text-sm font-semibold ${getStatusClass(request.status)}`}
                    >
                      {request.status}
                    </span>
                  </div>

                  <div className="mt-5 rounded-xl bg-white p-4">
                    <p className="font-medium text-slate-800">
                      {getStatusMessage(request.status)}
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="rounded-xl bg-white p-4">
                      <p className="text-sm text-slate-500">Start Date</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatDate(request.start_date)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-4">
                      <p className="text-sm text-slate-500">Return Date</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatDate(request.return_date)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-4">
                      <p className="text-sm text-slate-500">Number of Days</p>
                      <p className="mt-1 font-bold text-blue-600">
                        {request.total_days} days
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-4">
                      <p className="text-sm text-slate-500">Submitted</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-white p-4">
                    <p className="text-sm text-slate-500">Reason for Leave</p>
                    <p className="mt-2 text-slate-800">{request.reason}</p>
                  </div>

                  {request.attachment_url && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-100 bg-green-50 p-4">
                      <div className="flex items-center gap-3">
                        <FileText className="text-[#326536]" size={22} />
                        <div>
                          <p className="font-semibold text-slate-800">
                            Approval Evidence Attached
                          </p>
                          <p className="text-xs text-slate-500">
                            Supporting University approval document
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => viewEvidence(request.attachment_url!)}
                        className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#326536] hover:bg-green-100"
                      >
                        <Eye size={17} />
                        View Document
                      </button>
                    </div>
                  )}

                  {request.admin_comment && (
                    <div className="mt-4 rounded-xl bg-white p-4">
                      <p className="text-sm font-medium text-slate-500">
                        Director's Response
                      </p>

                      <p className="mt-2 text-slate-800">
                        {request.admin_comment}
                      </p>

                      {request.acting_person && (
                        <p className="mt-3 text-sm text-slate-500">
                          Actioned by:{" "}
                          <span className="font-medium text-slate-700">
                            {request.acting_person}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
