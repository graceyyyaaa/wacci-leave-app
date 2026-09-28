"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

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
};

type LeaveType = {
  id: string;
  name: string;
};

export default function LeaveRequestsPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaveRequests() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        /*
         * Load all leave requests belonging
         * to the currently logged in staff member.
         */
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
            created_at
          `,
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Leave requests error:", error);
          toast.error("Unable to load your leave requests.");
          return;
        }

        setRequests(data || []);

        /*
         * Load leave types.
         */
        const { data: typesData, error: typesError } = await supabase
          .from("leave_types")
          .select("id, name")
          .order("name");

        if (typesError) {
          console.error("Leave types error:", typesError);
        } else {
          setLeaveTypes(typesData || []);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        toast.error("Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    loadLeaveRequests();
  }, [router]);

  function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getLeaveTypeName(leaveTypeId: string | null) {
    if (!leaveTypeId) {
      return "Leave";
    }

    const leaveType = leaveTypes.find((type) => type.id === leaveTypeId);

    return leaveType?.name || "Leave";
  }

  function getStatusClass(status: string) {
    if (status === "Approved") {
      return "bg-green-100 text-green-700";
    }

    if (status === "Rejected") {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white px-8 py-6 shadow-sm">
          <p className="text-slate-600">Loading your leave requests...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Staff Portal
            </p>

            <h1 className="mt-2 text-4xl font-bold text-slate-900">
              My Leave Requests
            </h1>

            <p className="mt-2 text-lg text-slate-600">
              View and track all your submitted leave applications.
            </p>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Summary */}
        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl bg-yellow-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-yellow-700">Pending</p>

            <p className="mt-2 text-4xl font-bold text-yellow-600">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-2xl bg-green-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-green-700">Approved</p>

            <p className="mt-2 text-4xl font-bold text-green-600">
              {approvedCount}
            </p>
          </div>

          <div className="rounded-2xl bg-red-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-red-700">Rejected</p>

            <p className="mt-2 text-4xl font-bold text-red-600">
              {rejectedCount}
            </p>
          </div>
        </div>

        {/* Action */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Need to request leave?
              </h2>

              <p className="mt-1 text-slate-600">
                Submit a new leave application.
              </p>
            </div>

            <button
              onClick={() => router.push("/leave")}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Apply for Leave
            </button>
          </div>
        </div>

        {/* Requests */}
        <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Leave History</h2>

            <p className="mt-1 text-slate-600">
              All your submitted leave applications are listed below.
            </p>
          </div>

          {requests.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 px-6 py-16 text-center">
              <p className="text-xl font-semibold text-slate-700">
                No leave requests yet
              </p>

              <p className="mt-2 text-slate-500">
                Once you submit a leave application, it will appear here.
              </p>

              <button
                onClick={() => router.push("/leave")}
                className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
              >
                Apply for Leave
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
                >
                  {/* Top */}
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <p className="text-sm text-slate-500">Leave Type</p>

                      <h3 className="mt-1 text-2xl font-bold text-slate-900">
                        {getLeaveTypeName(request.leave_type_id)}
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        Submitted {formatDate(request.created_at.split("T")[0])}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
                        request.status,
                      )}`}
                    >
                      {request.status}
                    </span>
                  </div>

                  {/* Leave Information */}
                  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-white p-5">
                      <p className="text-sm text-slate-500">Start Date</p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {formatDate(request.start_date)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-5">
                      <p className="text-sm text-slate-500">Return Date</p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {formatDate(request.return_date)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-5">
                      <p className="text-sm text-slate-500">Number of Days</p>

                      <p className="mt-1 font-bold text-blue-600">
                        {request.total_days}{" "}
                        {request.total_days === 1 ? "day" : "days"}
                      </p>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="mt-4 rounded-xl bg-white p-5">
                    <p className="text-sm text-slate-500">Reason for Leave</p>

                    <p className="mt-2 text-slate-800">{request.reason}</p>
                  </div>

                  {/* Pending */}
                  {request.status === "Pending" && (
                    <div className="mt-4 rounded-xl bg-yellow-50 p-5">
                      <p className="font-semibold text-yellow-700">
                        Awaiting Administrator Approval
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Your leave request has been submitted and is currently
                        waiting for administrator review.
                      </p>
                    </div>
                  )}

                  {/* Approved */}
                  {request.status === "Approved" && (
                    <div className="mt-4 rounded-xl bg-green-50 p-5">
                      <p className="font-semibold text-green-700">
                        Leave Approved
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Your leave request has been approved.
                      </p>

                      {request.admin_comment && (
                        <div className="mt-4 rounded-xl bg-white p-4">
                          <p className="text-sm text-slate-500">
                            Administrator Comment
                          </p>

                          <p className="mt-1 text-slate-800">
                            {request.admin_comment}
                          </p>
                        </div>
                      )}

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

                  {/* Rejected */}
                  {request.status === "Rejected" && (
                    <div className="mt-4 rounded-xl bg-red-50 p-5">
                      <p className="font-semibold text-red-700">
                        Leave Rejected
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Your leave request has been rejected.
                      </p>

                      {request.admin_comment && (
                        <div className="mt-4 rounded-xl bg-white p-4">
                          <p className="text-sm text-slate-500">
                            Administrator Comment
                          </p>

                          <p className="mt-1 text-slate-800">
                            {request.admin_comment}
                          </p>
                        </div>
                      )}

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

                  {/* View Details */}
                  <button
                    onClick={() =>
                      router.push(`/leave-details?id=${request.id}`)
                    }
                    className="mt-5 w-full rounded-xl border border-blue-200 bg-white px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    View Full Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
