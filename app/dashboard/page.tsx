"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  XCircle,
  ArrowRight,
  FilePlus2,
  UserCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";

type Profile = {
  full_name: string;
  staff_id: string;
  email: string;
  position: string;
  phone: string | null;
  department_id: string | null;
  role: string;
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
          router.replace("/login");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(
            "full_name, staff_id, email, position, phone, department_id, role",
          )
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          console.error("Profile loading error:", profileError);
          toast.error("Could not load your profile.");
          return;
        }

        const role = String(profileData.role).toLowerCase();

        if (role === "admin") {
          router.replace("/admin");
          return;
        }

        if (role === "director") {
          router.replace("/director");
          return;
        }

        if (role !== "staff") {
          toast.error("Your account does not have dashboard access.");
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        setProfile(profileData);

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

  function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getLeaveTypeName(leaveTypeId: string | null) {
    if (!leaveTypeId) return "Leave";

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
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7F2]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#326536]/20 border-t-[#326536]" />
          <p className="text-sm font-medium text-slate-600">
            Loading your dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7F2] px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <UserCircle className="mx-auto mb-4 text-[#326536]" size={42} />
          <h1 className="text-xl font-bold text-slate-900">
            Profile Not Found
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Your account exists, but your staff profile could not be found.
            Please contact the WACCI administrator.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/login");
            }}
            className="mt-6 rounded-xl bg-[#326536] px-6 py-3 font-semibold text-white hover:bg-[#254D29]"
          >
            Return to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <DashboardLayout role="staff" fullName={profile.full_name}>
      {/* Welcome */}
      <section className="mb-8 rounded-2xl bg-[#326536] p-6 text-white shadow-sm sm:p-8">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Welcome back, {profile.full_name}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
            Manage your leave applications and track their approval status from
            your personal dashboard.
          </p>
        </div>
      </section>

      {/* Leave Summary */}
      <section className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-yellow-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600">
              Pending Requests
            </p>
            <div className="rounded-xl bg-yellow-100 p-3 text-yellow-700">
              <Clock3 size={22} />
            </div>
          </div>
          <p className="mt-5 text-4xl font-bold text-yellow-600">
            {pendingCount}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Awaiting director approval
          </p>
        </div>

        <div className="rounded-2xl border border-green-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600">
              Approved Requests
            </p>
            <div className="rounded-xl bg-green-100 p-3 text-green-700">
              <CheckCircle2 size={22} />
            </div>
          </div>
          <p className="mt-5 text-4xl font-bold text-green-600">
            {approvedCount}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Leave applications approved
          </p>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm sm:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600">
              Rejected Requests
            </p>
            <div className="rounded-xl bg-red-100 p-3 text-red-700">
              <XCircle size={22} />
            </div>
          </div>
          <p className="mt-5 text-4xl font-bold text-red-600">
            {rejectedCount}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Leave applications rejected
          </p>
        </div>
      </section>

      {/* Upcoming Leave */}
      <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Upcoming Leave
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Your next approved leave application.
            </p>
          </div>

          <button
            onClick={() => router.push("/leave")}
            className="rounded-xl bg-[#326536] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#254D29]"
          >
            Apply for Leave
          </button>
        </div>

        {leaveLoading ? (
          <div className="mt-6 rounded-xl bg-slate-50 p-6">
            <p className="text-sm text-slate-500">
              Loading leave information...
            </p>
          </div>
        ) : upcomingLeave ? (
          <div className="mt-6 rounded-2xl border border-green-100 bg-green-50 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-semibold text-green-700">
                  Approved Leave
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {getLeaveTypeName(upcomingLeave.leave_type_id)}
                </h3>
              </div>

              <span className="w-fit rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                Approved
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
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

              <div className="rounded-xl bg-white p-4">
                <p className="text-sm text-slate-500">Number of Days</p>
                <p className="mt-1 font-bold text-[#326536]">
                  {upcomingLeave.total_days}{" "}
                  {upcomingLeave.total_days === 1 ? "day" : "days"}
                </p>
              </div>
            </div>

            {upcomingLeave.admin_comment && (
              <div className="mt-4 rounded-xl bg-white p-4">
                <p className="text-sm font-semibold text-slate-500">
                  Director's Comment
                </p>
                <p className="mt-2 text-sm text-slate-800">
                  {upcomingLeave.admin_comment}
                </p>
                {upcomingLeave.acting_person && (
                  <p className="mt-2 text-xs text-slate-500">
                    Actioned by: {upcomingLeave.acting_person}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() =>
                router.push(`/leave-details?id=${upcomingLeave.id}`)
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#326536]/20 bg-white px-5 py-3 text-sm font-semibold text-[#326536] transition hover:bg-green-100"
            >
              View Leave Details
              <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center">
            <CalendarDays className="mx-auto mb-3 text-slate-400" size={34} />
            <p className="font-semibold text-slate-700">
              No upcoming approved leave
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Your approved leave applications will appear here.
            </p>
          </div>
        )}
      </section>

      {/* Recent Leave Requests */}
      <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Recent Leave Requests
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Track the status of your submitted leave applications.
            </p>
          </div>

          <button
            onClick={() => router.push("/leave")}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Apply for New Leave
          </button>
        </div>

        {leaveLoading ? (
          <div className="mt-6 rounded-xl bg-slate-50 p-6">
            <p className="text-sm text-slate-500">Loading requests...</p>
          </div>
        ) : leaveRequests.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center">
            <FilePlus2 className="mx-auto mb-3 text-slate-400" size={34} />
            <p className="font-semibold text-slate-700">
              No leave requests yet
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Your submitted leave requests will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {leaveRequests.slice(0, 5).map((request) => (
              <div
                key={request.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Leave Type
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">
                      {getLeaveTypeName(request.leave_type_id)}
                    </h3>
                    <p className="mt-2 text-xs text-slate-500">
                      Submitted {formatDate(request.created_at.split("T")[0])}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-4 py-2 text-xs font-semibold ${getStatusStyle(
                      request.status,
                    )}`}
                  >
                    {request.status}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs text-slate-500">Start Date</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDate(request.start_date)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs text-slate-500">Return Date</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDate(request.return_date)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs text-slate-500">Number of Days</p>
                    <p className="mt-1 font-bold text-[#326536]">
                      {request.total_days}{" "}
                      {request.total_days === 1 ? "day" : "days"}
                    </p>
                  </div>
                </div>

                {request.admin_comment && (
                  <div
                    className={`mt-4 rounded-xl p-4 ${
                      request.status === "Rejected"
                        ? "bg-red-50"
                        : request.status === "Approved"
                          ? "bg-green-50"
                          : "bg-yellow-50"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-700">
                      Director's Response
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {request.admin_comment}
                    </p>
                    {request.acting_person && (
                      <p className="mt-2 text-xs text-slate-500">
                        Actioned by: {request.acting_person}
                      </p>
                    )}
                  </div>
                )}

                {request.status === "Pending" && (
                  <div className="mt-4 rounded-xl bg-yellow-50 p-4">
                    <p className="text-sm font-semibold text-yellow-800">
                      Awaiting Approval
                    </p>
                    <p className="mt-1 text-sm text-yellow-700">
                      Your leave request is waiting for the Director's decision.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => router.push(`/leave-details?id=${request.id}`)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#326536] transition hover:bg-green-50"
                >
                  View Leave Details
                  <ArrowRight size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Profile Information */}
      <section className="mb-8">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            My Profile
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Your registered staff information.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { label: "Staff ID", value: profile.staff_id },
            { label: "Email Address", value: profile.email },
            { label: "Position", value: profile.position },
            { label: "Phone Number", value: profile.phone || "Not provided" },
            { label: "Department", value: "WACCI" },
            { label: "Account Status", value: "Active" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-2 break-words text-base font-semibold text-slate-900">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Leave Management */}
      <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Leave Management
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Need to request time off? Submit a new leave application.
        </p>

        <button
          onClick={() => router.push("/leave")}
          className="mt-6 flex w-full items-center justify-between gap-4 rounded-xl bg-[#326536] p-5 text-left text-white transition hover:bg-[#254D29]"
        >
          <span>
            <span className="block font-semibold">Apply for Leave</span>
            <span className="mt-1 block text-sm text-white/75">
              Submit a new leave request
            </span>
          </span>
          <ArrowRight size={22} />
        </button>
      </section>
    </DashboardLayout>
  );
}
