"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

  leave_types: {
    name: string;
  } | null;
};

export default function LeavePage() {
  const router = useRouter();

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  /*
   * Calculate number of leave days
   */
  const calculateDays = () => {
    if (!startDate || !endDate) {
      return 0;
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    if (end < start) {
      return 0;
    }

    const difference = end.getTime() - start.getTime();

    return Math.floor(difference / (1000 * 60 * 60 * 24)) + 1;
  };

  const totalDays = calculateDays();

  /*
   * Format dates
   */
  function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  /*
   * Get status styling
   */
  function getStatusClass(status: string) {
    if (status === "Approved") {
      return "bg-green-100 text-green-700 border-green-200";
    }

    if (status === "Rejected") {
      return "bg-red-100 text-red-700 border-red-200";
    }

    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  }

  /*
   * Get status message
   */
  function getStatusMessage(status: string) {
    if (status === "Approved") {
      return "Your leave request has been approved.";
    }

    if (status === "Rejected") {
      return "Your leave request has been rejected.";
    }

    return "Your leave request is awaiting administrator review.";
  }

  /*
   * Load leave types
   */
  async function loadLeaveTypes() {
    setLoadingTypes(true);

    try {
      const { data, error } = await supabase
        .from("leave_types")
        .select("id, name")
        .order("name");

      if (error) {
        console.error("Leave types error:", error);
        toast.error("Unable to load leave types.");
        return;
      }

      setLeaveTypes(data || []);
    } catch (error) {
      console.error("Unexpected leave types error:", error);
      toast.error("Unable to load leave types.");
    } finally {
      setLoadingTypes(false);
    }
  }

  /*
   * Load the logged in staff member's leave requests
   */
  async function loadMyRequests() {
    setLoadingRequests(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("User error:", userError);
        toast.error("Unable to verify your account.");
        return;
      }

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
          leave_types (
            name
          )
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("My leave requests error:", error);
        toast.error(error.message || "Unable to load your leave requests.");
        return;
      }

      setRequests((data || []) as unknown as LeaveRequest[]);
    } catch (error) {
      console.error("Unexpected requests error:", error);
      toast.error("Unable to load your leave requests.");
    } finally {
      setLoadingRequests(false);
    }
  }

  /*
   * Load page data
   */
  useEffect(() => {
    loadLeaveTypes();
    loadMyRequests();
  }, []);

  /*
   * Submit leave request
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!leaveTypeId) {
      toast.error("Please select a leave type.");
      return;
    }

    if (!startDate) {
      toast.error("Please select a start date.");
      return;
    }

    if (!endDate) {
      toast.error("Please select a return date.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast.error("Return date cannot be before the start date.");
      return;
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for your leave.");
      return;
    }

    if (totalDays <= 0) {
      toast.error("Please select valid leave dates.");
      return;
    }

    setLoading(true);

    try {
      /*
       * Get currently logged in staff member
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Authentication error:", userError);
        toast.error("Unable to verify your account.");
        return;
      }

      if (!user) {
        toast.error("Your session has expired. Please login again.");
        router.push("/login");
        return;
      }

      /*
       * Submit leave request
       */
      const { data, error } = await supabase
        .from("leave_requests")
        .insert({
          user_id: user.id,
          leave_type_id: leaveTypeId,
          start_date: startDate,
          return_date: endDate,
          total_days: totalDays,
          reason: reason.trim(),
          status: "Pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Leave request error:", error);
        toast.error(error.message || "Failed to submit leave request.");
        return;
      }

      console.log("Leave request created:", data);

      toast.success("Leave request submitted successfully.");

      /*
       * Clear form
       */
      setLeaveTypeId("");
      setStartDate("");
      setEndDate("");
      setReason("");

      /*
       * Immediately reload staff requests
       */
      await loadMyRequests();
    } catch (error) {
      console.error("Unexpected leave request error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /*
   * Counts
   */
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
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
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
          <div className="rounded-2xl bg-yellow-50 p-5 border border-yellow-100">
            <p className="text-sm font-medium text-yellow-700">Pending</p>

            <p className="mt-1 text-3xl font-bold text-yellow-700">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-2xl bg-green-50 p-5 border border-green-100">
            <p className="text-sm font-medium text-green-700">Approved</p>

            <p className="mt-1 text-3xl font-bold text-green-700">
              {approvedCount}
            </p>
          </div>

          <div className="rounded-2xl bg-red-50 p-5 border border-red-100">
            <p className="text-sm font-medium text-red-700">Rejected</p>

            <p className="mt-1 text-3xl font-bold text-red-700">
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
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                disabled={loadingTypes || loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-5 py-4 text-lg text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
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
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 bg-white px-5 py-4 text-lg text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
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
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={loading}
                  min={startDate || undefined}
                  className="w-full rounded-xl border border-slate-300 bg-white px-5 py-4 text-lg text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
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
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={loading}
                placeholder="Enter the reason for your leave"
                rows={7}
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-5 py-4 text-lg text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-1 gap-5 pt-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                disabled={loading}
                className="rounded-xl border border-slate-300 bg-white px-6 py-4 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || loadingTypes || !leaveTypeId}
                className="rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit Leave Request"}
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
              <p className="text-lg text-slate-500">
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
              {requests.map((request) => {
                const leaveType = request.leave_types;

                return (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
                  >
                    {/* Request Header */}
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          Leave Type
                        </p>

                        <h3 className="mt-1 text-2xl font-bold text-slate-900">
                          {leaveType?.name || "Leave Request"}
                        </h3>
                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full border px-4 py-2 text-sm font-semibold ${getStatusClass(
                          request.status,
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>

                    {/* Status Message */}
                    <div
                      className={`mt-5 rounded-xl p-4 ${
                        request.status === "Approved"
                          ? "bg-green-50"
                          : request.status === "Rejected"
                            ? "bg-red-50"
                            : "bg-yellow-50"
                      }`}
                    >
                      <p className="font-medium text-slate-800">
                        {getStatusMessage(request.status)}
                      </p>
                    </div>

                    {/* Leave Details */}
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
                          {request.total_days}{" "}
                          {request.total_days === 1 ? "day" : "days"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-white p-4">
                        <p className="text-sm text-slate-500">Submitted</p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {formatDate(request.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="mt-4 rounded-xl bg-white p-4">
                      <p className="text-sm text-slate-500">Reason for Leave</p>

                      <p className="mt-2 text-slate-800">{request.reason}</p>
                    </div>

                    {/* Administrator Response */}
                    {request.admin_comment && (
                      <div className="mt-4 rounded-xl bg-white p-4">
                        <p className="text-sm font-medium text-slate-500">
                          Administrator Response
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
