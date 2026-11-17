"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserCircle,
  Mail,
  Phone,
  Briefcase,
  Building2,
  ShieldCheck,
  Save,
  RefreshCw,
  Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface StaffProfile {
  id: string;
  full_name: string;
  email: string;
  staff_id: string;
  phone: string | null;
  position: string | null;
  department_id: string | null;
  role: string;
}

export default function StaffProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [department, setDepartment] = useState("Not assigned");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, staff_id, phone, position, department_id, role",
      )
      .eq("id", user.id)
      .single();

    if (error || !data) {
      setErrorMessage(error?.message || "Unable to load your profile.");
      setLoading(false);
      return;
    }

    if (data.role !== "staff") {
      if (data.role === "admin") router.replace("/admin");
      else if (data.role === "director") router.replace("/director");
      else router.replace("/login");
      return;
    }

    setProfile(data);
    setFullName(data.full_name || "");
    setPhone(data.phone || "");

    if (data.department_id) {
      const { data: departmentData } = await supabase
        .from("departments")
        .select("name")
        .eq("id", data.department_id)
        .maybeSingle();

      setDepartment(departmentData?.name || "Not assigned");
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!profile) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      setSaving(false);
      return;
    }

    if (password && password.length < 8) {
      setErrorMessage("Your password must contain at least 8 characters.");
      setSaving(false);
      return;
    }

    if (password && password !== confirmPassword) {
      setErrorMessage("The passwords do not match.");
      setSaving(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (profileError) {
      setErrorMessage(profileError.message);
      setSaving(false);
      return;
    }

    if (password) {
      const { error: passwordError } = await supabase.auth.updateUser({
        password,
      });

      if (passwordError) {
        setErrorMessage(
          "Your profile was saved, but the password could not be changed: " +
            passwordError.message,
        );
        setSaving(false);
        return;
      }
    }

    setPassword("");
    setConfirmPassword("");
    setMessage("Your profile has been updated successfully.");

    await loadProfile();
    setSaving(false);
  }

  function handleReset() {
    if (!profile) return;

    setFullName(profile.full_name || "");
    setPhone(profile.phone || "");
    setPassword("");
    setConfirmPassword("");
    setMessage("");
    setErrorMessage("");
  }

  if (loading) {
    return (
      <DashboardLayout role="staff" fullName={fullName}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <RefreshCw className="animate-spin text-[#326536]" size={30} />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout role="staff" fullName="Staff">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-red-600">
            {errorMessage || "Your profile could not be loaded."}
          </p>
          <button
            onClick={loadProfile}
            className="mt-4 rounded-xl bg-[#326536] px-5 py-3 text-white"
          >
            Try Again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="staff" fullName={profile.full_name}>
      <div className="mx-auto max-w-6xl space-y-6 pb-10">
        <div>
          <p className="text-sm font-medium text-[#326536]">Staff Portal</p>
          <h1 className="mt-1 text-2xl font-bold text-[#172033]">My Profile</h1>
          <p className="mt-2 text-sm text-gray-500">
            Manage your personal information and account security.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-5 bg-[#326536] px-7 py-8 text-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
              <UserCircle size={42} />
            </div>

            <div>
              <h2 className="text-xl font-bold">{profile.full_name}</h2>
              <p className="mt-1 text-sm text-white/75">
                {profile.position || "WACCI Staff"}
              </p>
              <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#C4DD5A] px-3 py-1 text-xs font-semibold text-[#173D20]">
                <ShieldCheck size={14} />
                Staff Account
              </span>
            </div>
          </div>

          <div className="space-y-8 p-6 md:p-8">
            <section>
              <h3 className="text-lg font-bold text-[#172033]">
                Personal Information
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Update the personal details associated with your account.
              </p>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Full Name
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-4">
                    <UserCircle size={19} className="text-gray-400" />
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full py-4 text-sm outline-none"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Email Address
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4">
                    <Mail size={19} className="text-gray-400" />
                    <input
                      value={profile.email}
                      readOnly
                      className="w-full bg-transparent py-4 text-sm text-gray-500 outline-none"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    Contact the Main Admin if your email needs to be changed.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Phone Number
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-4">
                    <Phone size={19} className="text-gray-400" />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full py-4 text-sm outline-none"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Position
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4">
                    <Briefcase size={19} className="text-gray-400" />
                    <input
                      value={profile.position || "Not specified"}
                      readOnly
                      className="w-full bg-transparent py-4 text-sm text-gray-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Staff ID
                  </label>
                  <input
                    value={profile.staff_id || "Not assigned"}
                    readOnly
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Department
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4">
                    <Building2 size={19} className="text-gray-400" />
                    <input
                      value={department}
                      readOnly
                      className="w-full bg-transparent py-4 text-sm text-gray-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Account Role
                  </label>
                  <input
                    value={profile.role}
                    readOnly
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500 outline-none"
                  />
                </div>
              </div>
            </section>

            <div className="border-t border-gray-100" />

            <section>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#F0F5EF] p-3 text-[#326536]">
                  <Lock size={21} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#172033]">
                    Change Password
                  </h3>
                  <p className="text-sm text-gray-500">
                    Leave these fields blank if you do not want to change your
                    password.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-xl border border-gray-200 px-4 py-4 text-sm outline-none focus:border-[#326536]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-xl border border-gray-200 px-4 py-4 text-sm outline-none focus:border-[#326536]"
                  />
                </div>
              </div>
            </section>

            {message && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                {message}
              </div>
            )}

            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6">
              <button
                onClick={handleReset}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw size={17} />
                Reset
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-[#326536] px-6 py-3 text-sm font-semibold text-white hover:bg-[#28532C] disabled:opacity-60"
              >
                {saving ? (
                  <RefreshCw size={17} className="animate-spin" />
                ) : (
                  <Save size={17} />
                )}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
