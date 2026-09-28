"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    if (!password) {
      toast.error("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("Login error:", error);
        toast.error(error.message || "Invalid email or password.");
        return;
      }

      if (!data.user) {
        toast.error("Unable to sign you in. Please try again.");
        return;
      }

      toast.success("Login successful!");

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Unexpected login error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F7F2] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl lg:grid-cols-2">
          {/* LEFT BRANDING PANEL */}
          <div className="hidden bg-[#326536] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
            <div>
              {/* WACCI BRAND */}
              <div className="mb-12 flex items-center gap-5">
                {/* Logo */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white p-2">
                  <img
                    src="/waccilogo.svg"
                    alt="WACCI Logo"
                    className="h-full w-full object-contain"
                  />
                </div>

                {/* Brand Name */}
                <div>
                  <p className="text-2xl font-bold tracking-wide">WACCI</p>

                  <p className="text-sm text-green-100">Staff Portal</p>
                </div>
              </div>

              {/* MAIN MESSAGE */}
              <div className="max-w-xl">
                <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-[#C4DD5A]">
                  Leave Management System
                </p>

                <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
                  Manage your leave with ease.
                </h1>

                <p className="mt-7 max-w-lg text-lg leading-8 text-green-50">
                  Submit leave applications, monitor their status and stay
                  informed throughout the approval process.
                </p>
              </div>
            </div>

            {/* ORGANISATION INFORMATION */}
            <div className="border-t border-white/20 pt-6">
              <p className="text-sm text-green-100">
                West Africa Centre for Crop Improvement
              </p>

              <p className="mt-1 text-xs text-green-200">University of Ghana</p>
            </div>
          </div>

          {/* RIGHT LOGIN PANEL */}
          <div className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-16">
            <div className="w-full max-w-md">
              {/* MOBILE LOGO */}
              <div className="mb-8 flex flex-col items-center lg:hidden">
                <div className="mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-green-100 bg-white p-2 shadow-sm">
                  <img
                    src="/waccilogo.svg"
                    alt="WACCI Logo"
                    className="h-full w-full object-contain"
                  />
                </div>

                <p className="text-xl font-bold text-[#326536]">WACCI</p>

                <p className="text-sm text-slate-500">Staff Portal</p>
              </div>

              {/* LOGIN CARD */}
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg sm:p-10">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-slate-900">
                    Welcome Back
                  </h2>

                  <p className="mt-3 leading-6 text-slate-500">
                    Sign in to access the WACCI Leave Management System.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  {/* EMAIL */}
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Email Address
                    </label>

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      autoComplete="email"
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#326536] focus:ring-4 focus:ring-[#326536]/10 disabled:bg-slate-100"
                    />
                  </div>

                  {/* PASSWORD */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="block text-sm font-semibold text-slate-700"
                      >
                        Password
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          toast.info("Password reset will be added next.")
                        }
                        className="text-sm font-medium text-[#326536] transition hover:text-[#214725] hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#326536] focus:ring-4 focus:ring-[#326536]/10 disabled:bg-slate-100"
                    />
                  </div>

                  {/* LOGIN BUTTON */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-[#326536] px-4 py-3.5 font-semibold text-white shadow-sm transition hover:bg-[#214725] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Signing in..." : "Login"}
                  </button>
                </form>

                {/* REGISTER */}
                <p className="mt-7 text-center text-sm text-slate-600">
                  Don't have an account?{" "}
                  <a
                    href="/register"
                    className="font-semibold text-[#326536] transition hover:text-[#214725] hover:underline"
                  >
                    Create an account
                  </a>
                </p>
              </div>

              {/* FOOTER */}
              <p className="mt-8 text-center text-xs text-slate-400">
                © 2026 WACCI. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
