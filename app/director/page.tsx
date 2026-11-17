"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  ArrowRight,
  RefreshCw,
  Loader2,
  CalendarDays,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";

type Summary = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

type RecentRequest = {
  id: string;
  start_date: string;
  return_date: string;
  total_days: number;
  status: string;
  staff_name: string;
  leave_type: string;
  department: string;
};

export default function DirectorDashboard() {
  const router = useRouter();

  const [fullName, setFullName] = useState("Director");
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (profileError || profile?.role?.toLowerCase() !== "director") {
        router.replace("/login");
        return;
      }

      setFullName(profile.full_name || "Director");

      const { data: requests, error: requestsError } = await supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      const rows = requests || [];

      const counts = {
        total: rows.length,
        pending: rows.filter((r) => r.status === "Pending").length,
        approved: rows.filter((r) => r.status === "Approved").length,
        rejected: rows.filter((r) => r.status === "Rejected").length,
      };

      setSummary(counts);

      const userIds = [...new Set(rows.slice(0, 5).map((r) => r.user_id))];
      const leaveTypeIds = [
        ...new Set(rows.slice(0, 5).map((r) => r.leave_type_id)),
      ];

      const [{ data: profiles }, { data: leaveTypes }] = await Promise.all([
        userIds.length
          ? supabase
              .from("profiles")
              .select("id, full_name, department_id")
              .in("id", userIds)
          : Promise.resolve({ data: [] }),
        leaveTypeIds.length
          ? supabase
              .from("leave_types")
              .select("id, name")
              .in("id", leaveTypeIds)
          : Promise.resolve({ data: [] }),
      ]);

      const departmentIds = [
        ...new Set(
          (profiles || []).map((p) => p.department_id).filter(Boolean),
        ),
      ];

      const { data: departments } = departmentIds.length
        ? await supabase
            .from("departments")
            .select("id, name")
            .in("id", departmentIds)
        : { data: [] };

      const recent = rows.slice(0, 5).map((request) => {
        const staff = (profiles || []).find((p) => p.id === request.user_id);
        const type = (leaveTypes || []).find(
          (t) => t.id === request.leave_type_id,
        );
        const department = (departments || []).find(
          (d) => d.id === staff?.department_id,
        );

        return {
          id: request.id,
          start_date: request.start_date,
          return_date: request.return_date,
          total_days: request.total_days,
          status: request.status,
          staff_name: staff?.full_name || "Unknown Staff",
          leave_type: type?.name || "Leave",
          department: department?.name || "N/A",
        };
      });

      setRecentRequests(recent);
    } catch (err: any) {
      console.error("Director dashboard error:", err);
      setError(err.message || "Unable to load dashboard information.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const formatDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const cards = [
    {
      label: "Total Applications",
      value: summary.total,
      icon: FileText,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Pending Approval",
      value: summary.pending,
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Approved",
      value: summary.approved,
      icon: CheckCircle,
      color: "bg-green-50 text-green-700",
    },
    {
      label: "Rejected",
      value: summary.rejected,
      icon: XCircle,
      color: "bg-red-50 text-red-600",
    },
  ];

  return (
    <DashboardLayout role="director" fullName={fullName}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#326536]">
              Director's Office
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#172033]">
              Director Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Welcome back, {fullName}. Here is your leave management overview.
            </p>
          </div>

          <button
            onClick={loadDashboard}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold text-[#172033]">
                      {loading ? "..." : card.value}
                    </p>
                  </div>
                  <div className={`rounded-xl p-3 ${card.color}`}>
                    <Icon size={23} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#172033]">
                Recent Leave Applications
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                The latest applications submitted by WACCI staff.
              </p>
            </div>

            <button
              onClick={() => router.push("/director/approvals")}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#326536] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#28522b]"
            >
              Review Applications
              <ArrowRight size={16} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="animate-spin text-[#326536]" size={28} />
            </div>
          ) : recentRequests.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">
              No leave applications found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-[#172033]">
                      {request.staff_name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {request.department} · {request.leave_type}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <CalendarDays size={14} />
                      {formatDate(request.start_date)} to{" "}
                      {formatDate(request.return_date)}
                      <span>({request.total_days} days)</span>
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                      request.status === "Approved"
                        ? "bg-green-50 text-green-700"
                        : request.status === "Rejected"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {request.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
