"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center">
        <div className="w-full text-center">
          {/* Organisation */}
          <p className="text-lg font-bold tracking-wide text-blue-600 md:text-xl">
            WEST AFRICA CENTRE FOR CROP IMPROVEMENT
          </p>

          {/* Main Heading */}
          <h1 className="mt-8 text-5xl font-bold leading-tight text-slate-900 md:text-7xl">
            Welcome to WACCI
          </h1>

          <h2 className="text-5xl font-bold leading-tight text-blue-600 md:text-7xl">
            Leave Management System
          </h2>

          {/* Description */}
          <p className="mx-auto mt-8 max-w-4xl text-lg leading-8 text-slate-600 md:text-xl">
            A simple and secure platform for WACCI staff to manage their leave
            applications, track requests, and receive updates from the
            administration.
          </p>

          {/* Buttons */}
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {/* Create Account */}
            <button
              onClick={() => router.push("/register")}
              className="rounded-xl bg-blue-600 px-10 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Create an Account
            </button>

            {/* Staff Login */}
            <button
              onClick={() => router.push("/login")}
              className="rounded-xl border border-slate-300 bg-white px-10 py-4 text-lg font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Login
            </button>

            {/* Admin Login */}
            <button
              onClick={() => router.push("/admin-login")}
              className="rounded-xl border border-blue-600 bg-white px-10 py-4 text-lg font-semibold text-blue-600 shadow-sm transition hover:bg-blue-50"
            >
              Admin Login
            </button>
          </div>

          {/* Footer */}
          <p className="mt-16 text-base text-slate-500">
            WACCI Leave Management Portal
          </p>
        </div>
      </div>
    </main>
  );
}
