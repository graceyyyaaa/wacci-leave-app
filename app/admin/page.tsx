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

  profiles: {
    full_name: string;
    staff_id: string;
  } | null;

  leave_types: {
    name: string;
  } | null;
};

export default function AdminPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  async function loadRequests() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/admin-login");
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
          profiles (
            full_name,
            staff_id
          ),
          leave_types (
            name
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Admin leave requests error:", error);
        toast.error(error.message);
        return;
      }

      setRequests((data || []) as unknown as LeaveRequest[]);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("Unable to load leave requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function updateRequest(
    requestId: string,
    status: "Approved" | "Rejected",
  ) {
    setUpdating(requestId);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Your session has expired. Please login again.");
        router.push("/admin-login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Admin profile error:", profileError);
      }

      const { error } = await supabase
        .from("leave_requests")
        .update({
          status,
          acting_person: profile?.full_name || "Administrator",
          admin_comment:
            status === "Approved"
              ? "Leave request approved."
              : "Leave request rejected.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) {
        console.error("Update request error:", error);
        toast.error(error.message);
        return;
      }

      toast.success(
        status === "Approved"
          ? "Leave request approved."
          : "Leave request rejected.",
      );

      await loadRequests();
    } catch (error) {
      console.error("Unexpected update error:", error);
      toast.error("Unable to update leave request.");
    } finally {
      setUpdating(null);
    }
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

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Administration
            </p>

            <h1 className="mt-2 text-4xl font-bold text-slate-900">
              Leave Management
            </h1>

            <p className="mt-2 text-lg text-slate-600">
              Review and manage staff leave requests.
            </p>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Pending Requests
            </p>

            <p className="mt-2 text-4xl font-bold text-yellow-600">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Approved Requests
            </p>

            <p className="mt-2 text-4xl font-bold text-green-600">
              {approvedCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Rejected Requests
            </p>

            <p className="mt-2 text-4xl font-bold text-red-600">
              {rejectedCount}
            </p>
          </div>
        </div>

        {/* Leave Requests */}
        <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Staff Leave Requests
            </h2>

            <p className="mt-1 text-slate-600">
              Review submitted leave applications.
            </p>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <p className="text-lg text-slate-500">
                Loading leave requests...
              </p>
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 py-16 text-center">
              <p className="text-xl font-semibold text-slate-700">
                No leave requests found
              </p>

              <p className="mt-2 text-slate-500">
                Submitted leave requests will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {requests.map((request) => {
                const profile = request.profiles;
                const leaveType = request.leave_types;

                return (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
                  >
                    {/* Staff Information */}
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          Staff Member
                        </p>

                        <h3 className="mt-1 text-2xl font-bold text-slate-900">
                          {profile?.full_name || "Unknown Staff"}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Staff ID: {profile?.staff_id || "Not available"}
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
                          request.status,
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>

                    {/* Leave Details */}
                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                      <div className="rounded-xl bg-white p-4">
                        <p className="text-sm text-slate-500">Leave Type</p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {leaveType?.name || "Not specified"}
                        </p>
                      </div>

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
                    </div>

                    {/* Reason */}
                    <div className="mt-4 rounded-xl bg-white p-4">
                      <p className="text-sm text-slate-500">Reason for Leave</p>

                      <p className="mt-2 text-slate-800">{request.reason}</p>
                    </div>

                    {/* Admin Comment */}
                    {request.admin_comment && (
                      <div className="mt-4 rounded-xl bg-white p-4">
                        <p className="text-sm text-slate-500">
                          Administrator Comment
                        </p>

                        <p className="mt-2 text-slate-800">
                          {request.admin_comment}
                        </p>

                        {request.acting_person && (
                          <p className="mt-2 text-sm text-slate-500">
                            Actioned by: {request.acting_person}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Buttons */}
                    {request.status === "Pending" && (
                      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <button
                          onClick={() => updateRequest(request.id, "Approved")}
                          disabled={updating === request.id}
                          className="flex-1 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updating === request.id
                            ? "Updating..."
                            : "Approve Leave"}
                        </button>

                        <button
                          onClick={() => updateRequest(request.id, "Rejected")}
                          disabled={updating === request.id}
                          className="flex-1 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updating === request.id
                            ? "Updating..."
                            : "Reject Leave"}
                        </button>
                      </div>
                    )}

                    {/* Submitted Date */}
                    <p className="mt-5 text-sm text-slate-500">
                      Submitted{" "}
                      {new Date(request.created_at).toLocaleDateString(
                        "en-GB",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </p>
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
