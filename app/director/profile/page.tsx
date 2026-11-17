"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  UserCircle,
  Mail,
  Phone,
  Briefcase,
  Building2,
  ShieldCheck,
  Save,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  LogOut,
} from "lucide-react";

type Profile = {
  id: string;
  full_name: string;
  staff_id: string;
  email: string;
  phone: string | null;
  position: string | null;
  department_id: string | null;
  role: string;
  department_name?: string;
};

export default function DirectorProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        window.location.href = "/login";
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, staff_id, email, phone, position, department_id, role",
        )
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (data.role?.toLowerCase() !== "director") {
        window.location.href = "/login";
        return;
      }

      let departmentName = "Not assigned";

      if (data.department_id) {
        const { data: department, error: departmentError } = await supabase
          .from("departments")
          .select("name")
          .eq("id", data.department_id)
          .maybeSingle();

        if (departmentError) throw departmentError;
        departmentName = department?.name || "Not assigned";
      }

      const loadedProfile = {
        ...data,
        department_name: departmentName,
      };

      setProfile(loadedProfile);
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setPosition(data.position || "");
    } catch (err: any) {
      console.error("Profile loading error:", err);
      setError(err.message || "Unable to load your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = async () => {
    if (!profile) return;

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.id !== profile.id) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          position: position.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select(
          "id, full_name, staff_id, email, phone, position, department_id, role",
        )
        .single();

      if (updateError) throw updateError;

      setProfile((previous) =>
        previous
          ? {
              ...previous,
              ...data,
              department_name: previous.department_name,
            }
          : previous,
      );

      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setPosition(data.position || "");
      setSuccess("Your profile has been updated successfully.");
    } catch (err: any) {
      console.error("Profile update error:", err);
      setError(err.message || "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please complete all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Your new passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError(
        "Your new password must be different from your current password.",
      );
      return;
    }

    setPasswordLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user?.email) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        throw new Error("Your current password is incorrect.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Your password has been changed successfully.");
    } catch (err: any) {
      console.error("Password update error:", err);
      setError(err.message || "Unable to change your password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const signOut = async () => {
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    window.location.href = "/login";
  };

  if (loading) {
    return (
      <DashboardLayout role="director" fullName="Director">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="animate-spin text-[#326536]" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      role="director"
      fullName={profile?.full_name || "Director"}
    >
      <div className="mx-auto max-w-5xl space-y-6 pb-8">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-[#326536]">
            Director's Office
          </p>
          <h1 className="text-2xl font-bold text-[#172033]">My Profile</h1>
          <p className="text-sm text-gray-500">
            Manage your personal information and account security.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            {success}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-4 border-b border-gray-100 bg-[#326536] p-6 text-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
              <UserCircle size={42} />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold">
                {profile?.full_name || "Director"}
              </h2>
              <p className="mt-1 text-sm text-white/80">
                {profile?.position || "Director"}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#C4DD5A] px-3 py-1 text-xs font-semibold text-[#244B29]">
                <ShieldCheck size={13} />
                Director Account
              </span>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div>
              <h3 className="font-bold text-[#172033]">Personal Information</h3>
              <p className="mt-1 text-sm text-gray-500">
                Update the personal details associated with your account.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Full Name
                </label>
                <div className="relative">
                  <UserCircle
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#326536]"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    value={profile?.email || ""}
                    readOnly
                    className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-500"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Contact the Main Admin if your email needs to be changed.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#326536]"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Position
                </label>
                <div className="relative">
                  <Briefcase
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#326536]"
                    placeholder="Enter your position"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Staff ID
                </label>
                <input
                  value={profile?.staff_id || "Not assigned"}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Department
                </label>
                <div className="relative">
                  <Building2
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    value={profile?.department_name || "Not assigned"}
                    readOnly
                    className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Account Role
                </label>
                <input
                  value={profile?.role || "Director"}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
              <button
                onClick={loadProfile}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw size={16} />
                Reset
              </button>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#326536] px-5 py-3 text-sm font-semibold text-white hover:bg-[#28522b] disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Save size={17} />
                )}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#326536]/10 text-[#326536]">
              <Lock size={22} />
            </div>
            <div>
              <h2 className="font-bold text-[#172033]">Change Password</h2>
              <p className="mt-1 text-sm text-gray-500">
                Verify your current password before setting a new one.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#326536]"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-12 text-sm outline-none focus:border-[#326536]"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#326536]"
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={changePassword}
              disabled={passwordLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#326536] px-5 py-3 text-sm font-semibold text-white hover:bg-[#28522b] disabled:opacity-60"
            >
              {passwordLoading ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Lock size={17} />
              )}
              {passwordLoading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-red-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-gray-800">Sign Out</h2>
            <p className="mt-1 text-sm text-gray-500">
              Sign out of your Director account on this device.
            </p>
          </div>

          <button
            onClick={signOut}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </section>
      </div>
    </DashboardLayout>
  );
}
