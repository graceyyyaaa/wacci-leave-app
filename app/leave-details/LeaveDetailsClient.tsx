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
  updated_at: string | null;
};

type LeaveType = {
  id: string;
  name: string;
};

type LeaveDetailsClientProps = {
  requestId: string;
};

export default function LeaveDetailsClient({
  requestId,
}: LeaveDetailsClientProps) {
  const router = useRouter();

  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [leaveType, setLeaveType] = useState<LeaveType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaveDetails() {
      try {
        if (!requestId) {
          toast.error("Leave request not found.");
          router.push("/dashboard");
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

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
            updated_at
          `,
          )
          .eq("id", requestId)
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Leave details error:", error);
          toast.error("Unable to load leave request.");
          router.push("/dashboard");
          return;
        }

        setRequest(data);

        if (data.leave_type_id) {
          const { data: leaveTypeData, error: leaveTypeError } = await supabase
            .from("leave_types")
            .select("id, name")
            .eq("id", data.leave_type_id)
            .single();

          if (leaveTypeError) {
            console.error("Leave type error:", leaveTypeError);
          } else {
            setLeaveType(leaveTypeData);
          }
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        toast.error("Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    loadLeaveDetails();
  }, [requestId, router]);

  function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatDateTime(date: string) {
    return new Date(date).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

    return "Your leave request is waiting for administrator review.";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white px-8 py-6 shadow-sm">
          <p className="text-slate-600">Loading leave details...</p>
        </div>
      </main>
    );
  }

  if (!request) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Staff Portal
            </p>

            <h1 className="mt-2 text-4xl font-bold text-slate-900">
              Leave Request Details
            </h1>

            <p className="mt-2 text-lg text-slate-600">
              View the complete details of your leave application.
            </p>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Dashboard
          </button>
        </div>

        <div
          className={`mb-6 rounded-2xl border p-6 ${getStatusClass(
            request.status,
          )}`}
        >
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-medium">Leave Request Status</p>

              <h2 className="mt-1 text-3xl font-bold">{request.status}</h2>

              <p className="mt-2">{getStatusMessage(request.status)}</p>
            </div>

            <span className="w-fit rounded-full bg-white px-5 py-2 text-sm font-bold">
              {request.status}
            </span>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              Leave Information
            </h2>

            <p className="mt-1 text-slate-600">
              Information submitted with your leave application.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Leave Type</p>

              <p className="mt-2 text-xl font-semibold text-slate-900">
                {leaveType?.name || "Not specified"}
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 p-5">
              <p className="text-sm text-slate-500">Number of Days</p>

              <p className="mt-2 text-xl font-bold text-blue-600">
                {request.total_days} {request.total_days === 1 ? "day" : "days"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Start Date</p>

              <p className="mt-2 text-xl font-semibold text-slate-900">
                {formatDate(request.start_date)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Return Date</p>

              <p className="mt-2 text-xl font-semibold text-slate-900">
                {formatDate(request.return_date)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">Reason for Leave</p>

            <p className="mt-2 text-lg leading-7 text-slate-800">
              {request.reason}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">Submitted On</p>

              <p className="mt-2 font-semibold text-slate-900">
                {formatDateTime(request.created_at)}
              </p>
            </div>

            {request.updated_at && (
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Last Updated</p>

                <p className="mt-2 font-semibold text-slate-900">
                  {formatDateTime(request.updated_at)}
                </p>
              </div>
            )}
          </div>

          {request.status !== "Pending" && (
            <div className="mt-8">
              <h3 className="text-2xl font-bold text-slate-900">
                Administrator Response
              </h3>

              <div
                className={`mt-4 rounded-2xl p-6 ${
                  request.status === "Approved" ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <p className="text-sm text-slate-500">Administrator Comment</p>

                <p className="mt-2 text-lg font-medium text-slate-900">
                  {request.admin_comment ||
                    "No administrator comment was provided."}
                </p>

                {request.acting_person && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <p className="text-sm text-slate-500">Actioned By</p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {request.acting_person}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {request.status === "Pending" && (
            <div className="mt-8 rounded-2xl bg-yellow-50 p-6">
              <h3 className="text-lg font-bold text-yellow-800">
                Awaiting Administrator Review
              </h3>

              <p className="mt-2 text-yellow-700">
                Your leave request has been submitted successfully and is
                currently waiting for approval. You will be able to see the
                administrator&apos;s response here once your request has been
                reviewed.
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-6 py-4 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to Dashboard
            </button>

            <button
              onClick={() => router.push("/leave")}
              className="flex-1 rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white transition hover:bg-blue-700"
            >
              Apply for New Leave
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
