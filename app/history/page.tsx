"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type LeaveRequest = {
  id: string;
  leave_type_id: string | null;
  start_date: string;
  return_date: string;
  total_days: number;
  reason: string;
  status: string | null;
  admin_comment: string | null;
  created_at: string;
};

type LeaveType = {
  id: string;
  name: string;
};

export default function HistoryPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRequests() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          toast.error("Please login again.");
          router.push("/login");
          return;
        }

        const { data: types, error: typesError } = await supabase
          .from("leave_types")
          .select("id, name");

        if (typesError) {
          console.error("Leave types error:", typesError);
        }

        setLeaveTypes(types || []);

        const { data, error } = await supabase
          .from("leave_requests")
          .select(
            "id, leave_type_id, start_date, return_date, total_days, reason, status, admin_comment, created_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Leave history error:", error);
          toast.error(error.message || "Unable to load your leave requests.");
          return;
        }

        setRequests(data || []);
      } catch (error) {
        console.error("Unexpected error:", error);
        toast.error("Something went wrong while loading your requests.");
      } finally {
        setLoading(false);
      }
    }

    loadRequests();
  }, [router]);

  function getLeaveTypeName(leaveTypeId: string | null) {
    if (!leaveTypeId) {
      return "Leave";
    }

    const leaveType = leaveTypes.find((type) => type.id === leaveTypeId);

    return leaveType?.name || "Leave";
  }

  function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getStatusClass(status: string | null) {
    switch (status?.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-700";

      case "rejected":
        return "bg-red-100 text-red-700";

      case "cancelled":
        return "bg-slate-100 text-slate-700";

      default:
        return "bg-yellow-100 text-yellow-700";
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-lg text-slate-600">
              Loading your leave requests...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mb-6 text-blue-600 hover:underline"
          >
            ← Back to Dashboard
          </button>

          <h1 className="text-4xl font-bold text-slate-900">
            My Leave Requests
          </h1>

          <p className="mt-3 text-lg text-slate-600">
            View and track your submitted leave requests.
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">
              No Leave Requests Yet
            </h2>

            <p className="mt-3 text-slate-600">
              You have not submitted any leave requests.
            </p>

            <button
              type="button"
              onClick={() => router.push("/leave")}
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Apply for Leave
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-3xl bg-white p-7 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Leave Type
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-slate-900">
                      {getLeaveTypeName(request.leave_type_id)}
                    </h2>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
                      request.status,
                    )}`}
                  >
                    {request.status || "Pending"}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">Start Date</p>

                    <p className="mt-2 font-semibold text-slate-900">
                      {formatDate(request.start_date)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">Return Date</p>

                    <p className="mt-2 font-semibold text-slate-900">
                      {formatDate(request.return_date)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-blue-50 p-5">
                    <p className="text-sm text-slate-500">Number of Days</p>

                    <p className="mt-2 font-semibold text-blue-600">
                      {request.total_days}{" "}
                      {request.total_days === 1 ? "day" : "days"}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-sm font-medium text-slate-500">Reason</p>

                  <p className="mt-2 rounded-2xl bg-slate-50 p-5 text-slate-700">
                    {request.reason}
                  </p>
                </div>

                {request.admin_comment && (
                  <div className="mt-5">
                    <p className="text-sm font-medium text-slate-500">
                      Administrator Comment
                    </p>

                    <p className="mt-2 rounded-2xl bg-slate-50 p-5 text-slate-700">
                      {request.admin_comment}
                    </p>
                  </div>
                )}

                <div className="mt-5 border-t border-slate-200 pt-5">
                  <p className="text-sm text-slate-500">
                    Submitted{" "}
                    {new Date(request.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
