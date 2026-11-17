"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function DirectorLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast.error("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        toast.error(error.message || "Invalid email or password.");
        return;
      }

      if (!data.user) {
        toast.error("Unable to verify your account.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        toast.error("Director profile could not be found.");
        return;
      }

      if (String(profile.role).toLowerCase().trim() !== "director") {
        await supabase.auth.signOut();
        toast.error("Access denied. Director access is required.");
        return;
      }

      toast.success("Welcome to the Director Portal!");

      router.replace("/director");
      router.refresh();
    } catch (error) {
      console.error("Director login error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F4F7F2] px-5 py-12">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#326536]/5 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[#C4DD5A]/15 blur-3xl" />

      <div className="relative w-full max-w-[480px]">
        {/* Back to home */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#326536]"
        >
          <ArrowLeft size={17} />
          Back to home
        </button>

        {/* Login Card */}
        <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_20px_70px_rgba(25,55,30,0.09)]">
          {/* Branding */}
          <div className="border-b border-slate-100 px-8 pb-8 pt-9 text-center sm:px-11">
            <div className="mx-auto mb-7 flex h-20 items-center justify-center">
              <img
                src="/waccilogo.svg"
                alt="WACCI Logo"
                className="h-full max-w-[220px] object-contain"
              />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-[34px]">
              Director Portal
            </h1>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500 sm:text-base">
              Sign in to review staff leave applications and manage approval
              decisions.
            </p>
          </div>

          {/* Login Form */}
          <div className="px-8 py-9 sm:px-11">
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your Director email"
                    autoComplete="email"
                    required
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#326536] focus:bg-white focus:ring-4 focus:ring-[#326536]/10 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#326536] focus:bg-white focus:ring-4 focus:ring-[#326536]/10 disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#326536]"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#326536] px-5 py-4 font-semibold text-white shadow-lg shadow-[#326536]/15 transition duration-200 hover:-translate-y-0.5 hover:bg-[#28542C] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing you in...
                  </>
                ) : (
                  <>
                    Access Director Portal
                    <ArrowRight
                      size={19}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>

            {/* Other Login Options */}
            <div className="mt-9 border-t border-slate-100 pt-7">
              <p className="mb-5 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                Other account access
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-600 transition hover:border-[#326536]/40 hover:bg-[#326536]/5 hover:text-[#326536]"
                >
                  Staff Login
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/admin-login")}
                  className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  Main Admin
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-5 text-center">
            <p className="text-xs font-medium text-slate-500">
              West Africa Centre for Crop Improvement
            </p>

            <p className="mt-1 text-xs text-slate-400">
              University of Ghana · © 2026 WACCI
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Authorised access only. Your account activity is protected.
        </p>
      </div>
    </main>
  );
}
