"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
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
      /*
       * Sign in with Supabase Authentication
       */
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("Admin login error:", error);
        toast.error(error.message || "Invalid email or password.");
        return;
      }

      if (!data.user) {
        toast.error("Unable to verify your account.");
        return;
      }

      /*
       * Get the user's profile
       *
       * Your profiles table contains:
       * id
       * full_name
       * staff_id
       * email
       * department_id
       * position
       * phone
       * role
       */
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, staff_id, department_id, position, phone, role",
        )
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);

        await supabase.auth.signOut();

        toast.error(
          "Your staff profile could not be found. Please contact the administrator.",
        );

        return;
      }

      /*
       * Check the user's role
       *
       * Only users with role = admin
       * can access the admin dashboard.
       */
      if (profile.role !== "admin") {
        await supabase.auth.signOut();

        toast.error(
          "Access denied. This account does not have administrator access.",
        );

        return;
      }

      /*
       * Admin authentication successful
       */
      toast.success("Admin login successful.");

      router.push("/admin");
    } catch (error) {
      console.error("Unexpected admin login error:", error);

      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto flex min-h-[85vh] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl bg-white p-8 shadow-sm md:p-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <p className="text-sm font-bold tracking-wide text-blue-600">
              WEST AFRICA CENTRE FOR CROP IMPROVEMENT
            </p>

            <h1 className="mt-5 text-3xl font-bold text-slate-900">
              WACCI Leave Management System
            </h1>

            <p className="mt-3 text-lg text-slate-600">Administrator Login</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Admin Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="it@wacci.ug.edu.gh"
                autoComplete="email"
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Login as Administrator"}
            </button>
          </form>

          {/* Back to Home */}
          <div className="mt-6 flex flex-col gap-3 text-center">
            <button
              type="button"
              onClick={() => router.push("/")}
              disabled={loading}
              className="text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              ← Back to Home
            </button>

            <button
              type="button"
              onClick={() => router.push("/login")}
              disabled={loading}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Staff Login
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
