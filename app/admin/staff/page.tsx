"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  Users,
  RefreshCw,
  UserCircle,
  Mail,
  Phone,
  Briefcase,
  Building2,
  X,
  Eye,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";

type Staff = {
  id: string;
  full_name: string;
  staff_id: string;
  email: string;
  position: string;
  phone: string | null;
  department_id: string | null;
  role: string;
  departments?: {
    name: string;
  } | null;
};

type Department = {
  id: string;
  name: string;
};

const registrationDepartments = [
  "Faculty",
  "Administration",
  "Supporting Staff",
];

export default function StaffManagementPage() {
  const router = useRouter();

  const [staff, setStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [adminName, setAdminName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const loadStaff = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        // Verify Main Admin access
        const { data: admin, error: adminError } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();

        if (adminError || !admin) {
          toast.error("Unable to verify administrator account.");
          return;
        }

        const role = String(admin.role).toLowerCase();

        if (role === "staff") {
          router.replace("/dashboard");
          return;
        }

        if (role === "director") {
          router.replace("/director");
          return;
        }

        if (role !== "admin") {
          toast.error("You are not authorized to access this page.");
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        setAdminName(admin.full_name);

        // Load staff profiles
        const { data: staffData, error: staffError } = await supabase
          .from("profiles")
          .select(
            `
          id,
          full_name,
          staff_id,
          email,
          position,
          phone,
          department_id,
          role,
          departments (
            name
          )
        `,
          )
          .eq("role", "staff")
          .order("full_name", { ascending: true });

        if (staffError) {
          console.error("Staff loading error:", staffError);
          toast.error(staffError.message);
          return;
        }

        setStaff((staffData || []) as unknown as Staff[]);

        // Load only the three official registration departments
        const { data: departmentData, error: departmentError } = await supabase
          .from("departments")
          .select("id, name")
          .in("name", registrationDepartments)
          .order("name");

        if (departmentError) {
          console.error("Department loading error:", departmentError);
          toast.error("Unable to load department filters.");
        } else {
          setDepartments(departmentData || []);
        }
      } catch (error) {
        console.error("Staff management error:", error);
        toast.error("Unable to load staff records.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router],
  );

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const filteredStaff = staff.filter((person) => {
    const search = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !search ||
      person.full_name?.toLowerCase().includes(search) ||
      person.staff_id?.toLowerCase().includes(search) ||
      person.email?.toLowerCase().includes(search) ||
      person.position?.toLowerCase().includes(search);

    const matchesDepartment =
      selectedDepartment === "All" ||
      person.department_id === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  function getDepartmentName(person: Staff) {
    return person.departments?.name || "Not assigned";
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F7F2]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#326536]/20 border-t-[#326536]" />
          <p className="text-sm font-medium text-slate-600">
            Loading staff records...
          </p>
        </div>
      </main>
    );
  }

  return (
    <DashboardLayout role="admin" fullName={adminName}>
      {/* Page Header */}
      <section className="mb-8 rounded-2xl bg-[#326536] p-6 text-white sm:p-8">
        <p className="text-sm font-medium text-[#C4DD5A]">
          Administration Workspace
        </p>

        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
          Staff Management
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
          View registered WACCI staff members, search employee information and
          inspect individual staff profiles.
        </p>
      </section>

      {/* Summary */}
      <section className="mb-8 grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600">
              Registered Staff
            </p>
            <div className="rounded-xl bg-green-100 p-3 text-[#326536]">
              <Users size={22} />
            </div>
          </div>

          <p className="mt-5 text-4xl font-bold text-slate-900">
            {staff.length}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Staff accounts registered in the system
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600">Departments</p>
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <Building2 size={22} />
            </div>
          </div>

          <p className="mt-5 text-4xl font-bold text-slate-900">
            {departments.length}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Official staff registration departments
          </p>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">Search Staff</h2>
          <p className="mt-1 text-sm text-slate-500">
            Find employees by name, staff ID, email or position.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_260px_auto]">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={19}
            />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search staff..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-800 outline-none transition focus:border-[#326536] focus:bg-white"
            />
          </div>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-[#326536]"
          >
            <option value="All">All Departments</option>

            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => loadStaff(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      {/* Staff Table */}
      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Registered Staff
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredStaff.length} of {staff.length} staff members
            </p>
          </div>
        </div>

        {filteredStaff.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-5 py-16 text-center">
            <Users className="mx-auto mb-3 text-slate-400" size={38} />

            <h3 className="font-semibold text-slate-700">No Staff Found</h3>

            <p className="mt-2 text-sm text-slate-500">
              Try changing your search or department filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-4 font-semibold">Staff Member</th>
                  <th className="px-4 py-4 font-semibold">Staff ID</th>
                  <th className="px-4 py-4 font-semibold">Department</th>
                  <th className="px-4 py-4 font-semibold">Position</th>
                  <th className="px-4 py-4 text-right font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredStaff.map((person) => (
                  <tr
                    key={person.id}
                    className="border-b border-slate-100 transition hover:bg-green-50/50"
                  >
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-[#326536]">
                          <UserCircle size={23} />
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {person.full_name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {person.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-5 text-sm text-slate-600">
                      {person.staff_id}
                    </td>

                    <td className="px-4 py-5">
                      <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-[#326536]">
                        {getDepartmentName(person)}
                      </span>
                    </td>

                    <td className="px-4 py-5 text-sm text-slate-600">
                      {person.position}
                    </td>

                    <td className="px-4 py-5 text-right">
                      <button
                        onClick={() => setSelectedStaff(person)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#326536] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#254D29]"
                      >
                        <Eye size={15} />
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Staff Profile Modal */}
      {selectedStaff && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
          onClick={() => setSelectedStaff(null)}
        >
          <div
            className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between rounded-t-2xl bg-[#326536] p-6 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#C4DD5A]">
                  Staff Profile
                </p>

                <h2 className="mt-2 text-xl font-bold">
                  {selectedStaff.full_name}
                </h2>
              </div>

              <button
                onClick={() => setSelectedStaff(null)}
                aria-label="Close profile"
                className="rounded-lg p-2 transition hover:bg-white/10"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="flex items-center gap-3">
                <UserCircle className="text-[#326536]" size={21} />
                <div>
                  <p className="text-xs text-slate-500">Staff ID</p>
                  <p className="font-semibold text-slate-900">
                    {selectedStaff.staff_id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="text-[#326536]" size={21} />
                <div>
                  <p className="text-xs text-slate-500">Email Address</p>
                  <p className="break-all font-semibold text-slate-900">
                    {selectedStaff.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="text-[#326536]" size={21} />
                <div>
                  <p className="text-xs text-slate-500">Phone Number</p>
                  <p className="font-semibold text-slate-900">
                    {selectedStaff.phone || "Not provided"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Briefcase className="text-[#326536]" size={21} />
                <div>
                  <p className="text-xs text-slate-500">Position</p>
                  <p className="font-semibold text-slate-900">
                    {selectedStaff.position}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Building2 className="text-[#326536]" size={21} />
                <div>
                  <p className="text-xs text-slate-500">Department</p>
                  <p className="font-semibold text-slate-900">
                    {getDepartmentName(selectedStaff)}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <p className="text-xs text-slate-500">Account Role</p>
                <span className="mt-2 inline-flex rounded-full bg-green-100 px-4 py-2 text-xs font-semibold text-green-700">
                  {selectedStaff.role}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 p-5">
              <button
                onClick={() => setSelectedStaff(null)}
                className="w-full rounded-xl bg-[#326536] px-5 py-3 font-semibold text-white transition hover:bg-[#254D29]"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
