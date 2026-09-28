"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Profile = {
  full_name: string;
  staff_id: string;
  email: string;
  position: string;
  phone: string | null;
  department_id: string | null;
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
};

type LeaveType = {
  id: string;
  name: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaveLoading, setLeaveLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        /* Load profile */
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, staff_id, email, position, phone, department_id")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Profile loading error:", profileError);
          toast.error("Could not load your profile.");
          return;
        }

        setProfile(profileData);

        /* Load staff leave requests */
        const { data: requestsData, error: requestsError } = await supabase
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

        if (requestsError) {
          console.error("Leave requests error:", requestsError);
          toast.error("Could not load your leave requests.");
          return;
        }

        setLeaveRequests(requestsData || []);

        /* Load leave types */
        const { data: leaveTypesData, error: leaveTypesError } = await supabase
          .from("leave_types")
          .select("id, name")
          .order("name");

        if (leaveTypesError) {
          console.error("Leave types error:", leaveTypesError);
        } else {
          setLeaveTypes(leaveTypesData || []);
        }
      } catch (error) {
        console.error("Dashboard error:", error);
        toast.error("Something went wrong.");
      } finally {
        setLoading(false);
        setLeaveLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

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

  function getStatusStyle(status: string) {
    if (status === "Approved") {
      return "bg-green-100 text-green-700";
    }

    if (status === "Rejected") {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
  }

  const pendingCount = leaveRequests.filter(
    (request) => request.status === "Pending",
  ).length;

  const approvedCount = leaveRequests.filter(
    (request) => request.status === "Approved",
  ).length;

  const rejectedCount = leaveRequests.filter(
    (request) => request.status === "Rejected",
  ).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingLeave = leaveRequests
    .filter((request) => {
      const startDate = new Date(`${request.start_date}T00:00:00`);

      return request.status === "Approved" && startDate >= today;
    })
    .sort(
      (a, b) =>
        new Date(`${a.start_date}T00:00:00`).getTime() -
        new Date(`${b.start_date}T00:00:00`).getTime(),
    )[0];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-xl bg-white px-8 py-6 shadow">
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-xl bg-white px-8 py-6 text-center shadow">
          <h1 className="mb-2 text-xl font-semibold text-slate-900">
            Profile Not Found
          </h1>

          <p className="mb-5 text-slate-600">
            Your account exists, but your staff profile could not be found.
          </p>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              WACCI Leave Management System
            </h1>

            <p className="mt-1 text-sm text-slate-500">Staff Dashboard</p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* Welcome */}
        <div className="mb-8 rounded-2xl bg-white p-8 shadow-sm">
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-blue-600">
            Staff Portal
          </p>

          <h2 className="text-3xl font-bold text-slate-900">
            Welcome back, {profile.full_name}
          </h2>

          <p className="mt-2 text-slate-600">
            Manage your leave applications and track their approval status from
            your dashboard.
          </p>
        </div>

        {/* Leave Summary */}
        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-yellow-700">
              Pending Requests
            </p>

            <p className="mt-2 text-4xl font-bold text-yellow-600">
              {pendingCount}
            </p>

            <p className="mt-2 text-sm text-yellow-700">
              Awaiting administrator review
            </p>
          </div>

          <div className="rounded-2xl border border-green-100 bg-green-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-green-700">
              Approved Requests
            </p>

            <p className="mt-2 text-4xl font-bold text-green-600">
              {approvedCount}
            </p>

            <p className="mt-2 text-sm text-green-700">
              Leave applications approved
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-red-700">
              Rejected Requests
            </p>

            <p className="mt-2 text-4xl font-bold text-red-600">
              {rejectedCount}
            </p>

            <p className="mt-2 text-sm text-red-700">
              Leave applications rejected
            </p>
          </div>
        </div>

        {/* Upcoming Leave */}
        <div className="mb-8 rounded-2xl bg-white p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                Upcoming Leave
              </h3>

              <p className="mt-1 text-slate-600">
                Your next approved leave application.
              </p>
            </div>

            <button
              onClick={() => router.push("/leave")}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Apply for Leave
            </button>
          </div>

          {leaveLoading ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-6">
              <p className="text-slate-500">Loading leave information...</p>
            </div>
          ) : upcomingLeave ? (
            <div className="mt-6 rounded-2xl border border-green-100 bg-green-50 p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <p className="text-sm font-medium text-green-700">
                    Approved Leave
                  </p>

                  <h4 className="mt-1 text-2xl font-bold text-slate-900">
                    {getLeaveTypeName(upcomingLeave.leave_type_id)}
                  </h4>
                </div>

                <span className="w-fit rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                  Approved
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-white p-4">
                  <p className="text-sm text-slate-500">Start Date</p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDate(upcomingLeave.start_date)}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-4">
                  <p className="text-sm text-slate-500">Return Date</p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDate(upcomingLeave.return_date)}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-sm text-slate-500">Number of Days</p>

                  <p className="mt-1 font-bold text-blue-600">
                    {upcomingLeave.total_days}{" "}
                    {upcomingLeave.total_days === 1 ? "day" : "days"}
                  </p>
                </div>
              </div>

              {upcomingLeave.admin_comment && (
                <div className="mt-4 rounded-xl bg-white p-4">
                  <p className="text-sm text-slate-500">
                    Administrator Comment
                  </p>

                  <p className="mt-1 text-slate-800">
                    {upcomingLeave.admin_comment}
                  </p>

                  {upcomingLeave.acting_person && (
                    <p className="mt-2 text-sm text-slate-500">
                      Actioned by: {upcomingLeave.acting_person}
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={() =>
                  router.push(`/leave-details?id=${upcomingLeave.id}`)
                }
                className="mt-5 w-full rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                View Leave Details
              </button>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center">
              <p className="text-lg font-semibold text-slate-700">
                No upcoming approved leave
              </p>

              <p className="mt-2 text-slate-500">
                Your approved leave applications will appear here.
              </p>
            </div>
          )}
        </div>

        {/* Recent Leave Requests */}
        <div className="mb-8 rounded-2xl bg-white p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">
                Recent Leave Requests
              </h3>

              <p className="mt-1 text-slate-600">
                Track the status of your submitted leave applications.
              </p>
            </div>

            <button
              onClick={() => router.push("/leave")}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Apply for New Leave
            </button>
          </div>

          {leaveLoading ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-6">
              <p className="text-slate-500">Loading requests...</p>
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center">
              <p className="text-lg font-semibold text-slate-700">
                No leave requests yet
              </p>

              <p className="mt-2 text-slate-500">
                Your submitted leave requests will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {leaveRequests.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <p className="text-sm text-slate-500">Leave Type</p>

                      <h4 className="mt-1 text-xl font-bold text-slate-900">
                        {getLeaveTypeName(request.leave_type_id)}
                      </h4>

                      <p className="mt-2 text-sm text-slate-500">
                        Submitted {formatDate(request.created_at.split("T")[0])}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${getStatusStyle(
                        request.status,
                      )}`}
                    >
                      {request.status}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
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

                  {request.status === "Approved" && request.admin_comment && (
                    <div className="mt-4 rounded-xl bg-green-50 p-4">
                      <p className="text-sm font-medium text-green-700">
                        Administrator Response
                      </p>

                      <p className="mt-1 text-slate-800">
                        {request.admin_comment}
                      </p>

                      {request.acting_person && (
                        <p className="mt-2 text-sm text-slate-500">
                          Actioned by: {request.acting_person}
                        </p>
                      )}
                    </div>
                  )}

                  {request.status === "Rejected" && request.admin_comment && (
                    <div className="mt-4 rounded-xl bg-red-50 p-4">
                      <p className="text-sm font-medium text-red-700">
                        Administrator Response
                      </p>

                      <p className="mt-1 text-slate-800">
                        {request.admin_comment}
                      </p>

                      {request.acting_person && (
                        <p className="mt-2 text-sm text-slate-500">
                          Actioned by: {request.acting_person}
                        </p>
                      )}
                    </div>
                  )}

                  {request.status === "Pending" && (
                    <div className="mt-4 rounded-xl bg-yellow-50 p-4">
                      <p className="text-sm font-medium text-yellow-700">
                        Awaiting Approval
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        Your leave request is currently waiting for
                        administrator review.
                      </p>
                    </div>
                  )}

                  {/* View Details */}
                  <button
                    onClick={() =>
                      router.push(`/leave-details?id=${request.id}`)
                    }
                    className="mt-5 w-full rounded-xl border border-blue-200 bg-white px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    View Leave Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile Information */}
        <div className="mb-8">
          <h3 className="mb-5 text-2xl font-bold text-slate-900">My Profile</h3>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Staff ID</p>

              <p className="mt-2 text-xl font-semibold text-slate-900">
                {profile.staff_id}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Email Address</p>

              <p className="mt-2 break-all text-lg font-semibold text-slate-900">
                {profile.email}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Position</p>

              <p className="mt-2 text-xl font-semibold text-slate-900">
                {profile.position}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Phone Number</p>

              <p className="mt-2 text-xl font-semibold text-slate-900">
                {profile.phone || "Not provided"}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Department</p>

              <p className="mt-2 text-xl font-semibold text-slate-900">WACCI</p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Account Status</p>

              <p className="mt-2 text-xl font-semibold text-green-600">
                Active
              </p>
            </div>
          </div>
        </div>

        {/* Leave Management */}
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h3 className="text-2xl font-bold text-slate-900">
            Leave Management
          </h3>

          <p className="mt-2 text-slate-600">
            Need to request time off? Submit a new leave application.
          </p>

          <div className="mt-6">
            <button
              onClick={() => router.push("/leave")}
              className="w-full rounded-xl bg-blue-600 px-6 py-4 text-left font-semibold text-white transition hover:bg-blue-700"
            >
              <span className="block text-lg">Apply for Leave</span>

              <span className="mt-1 block text-sm font-normal text-blue-100">
                Submit a new leave request
              </span>
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
