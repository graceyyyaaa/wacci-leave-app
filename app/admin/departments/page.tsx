"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Search,
  RefreshCw,
  ArrowLeft,
  Users,
  Loader2,
  Plus,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";

type Department = {
  id: string;
  name: string;
  created_at: string;
  is_registration_enabled: boolean;
};

export default function DepartmentsPage() {
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("Administrator");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );

  const [departmentName, setDepartmentName] = useState("");
  const [registrationEnabled, setRegistrationEnabled] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      router.replace("/login");
      return;
    }

    const role = String(profile.role).toLowerCase();

    if (role !== "admin") {
      router.replace(role === "director" ? "/director" : "/dashboard");
      return;
    }

    setFullName(profile.full_name || "Administrator");
    await loadDepartments();
  }

  async function loadDepartments() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("departments")
      .select("id, name, created_at, is_registration_enabled")
      .order("name", { ascending: true });

    if (error) {
      setError(error.message);
      setDepartments([]);
      setLoading(false);
      return;
    }

    setDepartments(data || []);
    setLoading(false);
  }

  function openAddModal() {
    setEditingDepartment(null);
    setDepartmentName("");
    setRegistrationEnabled(false);
    setModalOpen(true);
  }

  function openEditModal(department: Department) {
    setEditingDepartment(department);
    setDepartmentName(department.name);
    setRegistrationEnabled(department.is_registration_enabled);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingDepartment(null);
    setDepartmentName("");
    setRegistrationEnabled(false);
  }

  async function handleSaveDepartment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = departmentName.trim();

    if (!trimmedName) {
      toast.error("Please enter a department name.");
      return;
    }

    const duplicate = departments.some(
      (department) =>
        department.name.toLowerCase() === trimmedName.toLowerCase() &&
        department.id !== editingDepartment?.id,
    );

    if (duplicate) {
      toast.error("A department with this name already exists.");
      return;
    }

    setSaving(true);

    try {
      if (editingDepartment) {
        const { error } = await supabase
          .from("departments")
          .update({
            name: trimmedName,
            is_registration_enabled: registrationEnabled,
          })
          .eq("id", editingDepartment.id);

        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success("Department updated successfully.");
      } else {
        const { error } = await supabase.from("departments").insert({
          name: trimmedName,
          is_registration_enabled: registrationEnabled,
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success("Department added successfully.");
      }

      setModalOpen(false);
      setEditingDepartment(null);
      setDepartmentName("");
      setRegistrationEnabled(false);

      await loadDepartments();
    } catch (error) {
      console.error("Department save error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRegistration(department: Department) {
    const newValue = !department.is_registration_enabled;

    const { error } = await supabase
      .from("departments")
      .update({
        is_registration_enabled: newValue,
      })
      .eq("id", department.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setDepartments((previous) =>
      previous.map((item) =>
        item.id === department.id
          ? { ...item, is_registration_enabled: newValue }
          : item,
      ),
    );

    toast.success(
      newValue
        ? `${department.name} enabled for registration.`
        : `${department.name} disabled for registration.`,
    );
  }

  const filteredDepartments = departments.filter((department) =>
    department.name.toLowerCase().includes(search.toLowerCase()),
  );

  const registrationCount = departments.filter(
    (department) => department.is_registration_enabled,
  ).length;

  return (
    <DashboardLayout role="admin" fullName={fullName}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => router.push("/admin")}
              className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#326536]"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>

            <h1 className="text-2xl font-bold text-gray-900">
              Department Management
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Create, update and manage WACCI departments.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadDepartments}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#326536] px-5 py-3 text-sm font-semibold text-white hover:bg-[#254d29]"
            >
              <Plus size={18} />
              Add Department
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Departments</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {departments.length}
                </p>
              </div>
              <div className="rounded-xl bg-green-50 p-3 text-[#326536]">
                <Building2 size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Available for Registration
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {registrationCount}
                </p>
              </div>
              <div className="rounded-xl bg-lime-50 p-3 text-[#326536]">
                <Users size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-gray-900">All Departments</h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage department records and registration availability.
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search departments..."
                className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#326536]"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <Loader2 className="mr-2 animate-spin" size={20} />
              Loading departments...
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
              No departments found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-4">Department</th>
                    <th className="px-4 py-4">Created Date</th>
                    <th className="px-4 py-4">Registration</th>
                    <th className="px-4 py-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDepartments.map((department) => (
                    <tr
                      key={department.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-green-50 p-2 text-[#326536]">
                            <Building2 size={18} />
                          </div>
                          <span className="font-semibold text-gray-800">
                            {department.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-5 text-sm text-gray-500">
                        {new Date(department.created_at).toLocaleDateString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </td>

                      <td className="px-4 py-5">
                        <button
                          onClick={() => toggleRegistration(department)}
                          className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                            department.is_registration_enabled
                              ? "bg-green-50 text-green-700 hover:bg-green-100"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {department.is_registration_enabled
                            ? "Enabled"
                            : "Disabled"}
                        </button>
                      </td>

                      <td className="px-4 py-5">
                        <button
                          onClick={() => openEditModal(department)}
                          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-[#326536] hover:text-[#326536]"
                        >
                          <Pencil size={15} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>
              Departments are not deleted from this page. Existing staff records
              remain connected to their assigned departments.
            </p>
          </div>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingDepartment
                      ? "Edit Department"
                      : "Add New Department"}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Enter the department details below.
                  </p>
                </div>

                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveDepartment} className="space-y-5">
                <div>
                  <label
                    htmlFor="departmentName"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Department Name
                  </label>

                  <input
                    id="departmentName"
                    type="text"
                    value={departmentName}
                    onChange={(event) => setDepartmentName(event.target.value)}
                    placeholder="Enter department name"
                    required
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#326536] focus:ring-2 focus:ring-green-100"
                  />
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-800">
                        Allow Staff Registration
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Make this department available in the registration form.
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={registrationEnabled}
                      onClick={() =>
                        setRegistrationEnabled(!registrationEnabled)
                      }
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                        registrationEnabled ? "bg-[#326536]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                          registrationEnabled ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    {registrationEnabled
                      ? "This department will appear in the registration dropdown."
                      : "This department will not appear in the registration dropdown."}
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#326536] px-5 py-3 text-sm font-semibold text-white hover:bg-[#254d29] disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={17} />
                        {editingDepartment ? "Save Changes" : "Add Department"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
