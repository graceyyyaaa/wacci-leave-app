"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  Clock3,
  CheckCircle2,
  XCircle,
  FileText,
  CalendarDays,
  RefreshCw,
  Building2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";

type AdminProfile = {
  full_name: string;
  email: string;
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

  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadRequests(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      // Verify Main Admin role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error("Admin profile error:", profileError);
        toast.error("Unable to verify your administrator profile.");
        return;
      }

      const role = String(profile.role).toLowerCase();

      if (role === "staff") {
        router.replace("/dashboard");
        return;
      }

      if (role === "director") {
        router.replace("/director");
        return;
      }

      if (role !== "admin") {
        toast.error("You are not authorized to access this dashboard.");
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setAdminProfile(profile);

      // Load all staff leave requests
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
        toast.error(error.message || "Unable to load leave records.");
        return;
      }

      setRequests((data || []) as unknown as LeaveRequest[]);
    } catch (error) {
      console.error("Unexpected admin dashboard error:", error);
      toast.error("Something went wrong while loading the dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

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

  const totalDays = requests.reduce(
    (total, request) =>
      request.status === "Approved" ? total + request.total_days : total,
    0,
  );

  const uniqueStaff = new Set(requests.map((request) => request.user_id)).size;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7F2]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#326536]/20 border-t-[#326536]" />
          <p className="text-sm font-medium text-slate-600">
            Loading administration dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (!adminProfile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7F2] px-4">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Unable to Load Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Your administrator profile could not be verified.
          </p>
          <button
            onClick={() => router.replace("/login")}
            className="mt-5 rounded-xl bg-[#326536] px-6 py-3 font-semibold text-white"
          >
            Return to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <DashboardLayout role="admin" fullName={adminProfile.full_name}>
      {/* Welcome Header */}
      <section className="mb-8 rounded-2xl bg-[#326536] p-6 text-white shadow-sm sm:p-8">
        <p className="text-sm font-medium text-[#C4DD5A]">
          Administration Workspace
        </p>

        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
          Welcome back, {adminProfile.full_name}
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
          Manage WACCI staff information, monitor leave applications and oversee
          administrative records from one central workspace.
        </p>
      </section>

      {/* Summary Cards */}
      <section className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600">Total Staff</p>
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <Users size={22} />
            </div>
          </div>

          <p className="mt-5 text-4xl font-bold text-slate-900">
            {uniqueStaff}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Staff with leave records
          </p>
        </div>

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
            Awaiting Director's decision
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
            Approved leave applications
          </p>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
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
            Rejected leave applications
          </p>
        </div>
      </section>

      {/* Management Overview */}
      <section className="mb-8">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Management Overview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Monitor the main administrative activities.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-100 p-3 text-[#326536]">
                <Building2 size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">
                  Department Management
                </h3>
                <p className="text-sm text-slate-500">
                  Manage WACCI departments
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Department management will provide access to department
              information and staff assignments.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <FileText size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Leave Records</h3>
                <p className="text-sm text-slate-500">
                  Administrative leave monitoring
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Monitor submitted applications, approval outcomes and staff leave
              records. Leave decisions remain the responsibility of the
              Director.
            </p>
          </div>
        </div>
      </section>

      {/* Leave Statistics */}
      <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Leave Statistics
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Summary of approved leave days across the records available.
            </p>
          </div>

          <div className="rounded-xl bg-green-50 px-5 py-4">
            <p className="text-xs font-medium text-green-700">
              Total Approved Leave Days
            </p>
            <p className="mt-1 text-2xl font-bold text-[#326536]">
              {totalDays}
            </p>
          </div>
        </div>
      </section>

      {/* Staff Leave Records */}
      <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Staff Leave Records
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              View and monitor submitted staff leave applications.
            </p>
          </div>

          <button
            onClick={() => loadRequests(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
            Refresh Records
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-5 py-16 text-center">
            <FileText className="mx-auto mb-3 text-slate-400" size={38} />
            <h3 className="font-semibold text-slate-700">
              No Leave Records Found
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Submitted staff leave applications will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {requests.map((request) => (
              <article
                key={request.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6"
              >
                {/* Staff Information */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Staff Member
                    </p>

                    <h3 className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">
                      {request.profiles?.full_name || "Unknown Staff"}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Staff ID: {request.profiles?.staff_id || "Not available"}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-4 py-2 text-xs font-semibold ${getStatusClass(
                      request.status,
                    )}`}
                  >
                    {request.status}
                  </span>
                </div>

                {/* Leave Details */}
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs text-slate-500">Leave Type</p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {request.leave_types?.name || "Not specified"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs text-slate-500">Start Date</p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {formatDate(request.start_date)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs text-slate-500">Return Date</p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {formatDate(request.return_date)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-xs text-slate-500">Number of Days</p>
                    <p className="mt-2 font-bold text-[#326536]">
                      {request.total_days}{" "}
                      {request.total_days === 1 ? "day" : "days"}
                    </p>
                  </div>
                </div>

                {/* Reason */}
                <div className="mt-4 rounded-xl bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">
                    Reason for Leave
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-800">
                    {request.reason}
                  </p>
                </div>

                {/* Director's Decision */}
                {request.admin_comment && (
                  <div className="mt-4 rounded-xl bg-white p-4">
                    <p className="text-xs font-semibold text-slate-500">
                      Director's Comment
                    </p>
                    <p className="mt-2 text-sm text-slate-800">
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
                  <div className="mt-4 rounded-xl border border-yellow-100 bg-yellow-50 p-4">
                    <p className="text-sm font-semibold text-yellow-800">
                      Awaiting Director's Decision
                    </p>
                    <p className="mt-1 text-xs text-yellow-700">
                      This application is pending review by the Director.
                    </p>
                  </div>
                )}

                {/* Submission Date */}
                <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
                  <CalendarDays size={15} />
                  Submitted {formatDate(request.created_at.split("T")[0])}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
