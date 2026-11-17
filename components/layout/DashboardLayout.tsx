"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

type UserRole = "staff" | "admin" | "director";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: UserRole;
  fullName?: string;
}

const roleLabels: Record<UserRole, string> = {
  staff: "Staff",
  admin: "Main Admin",
  director: "Director",
};

export default function DashboardLayout({
  children,
  role,
  fullName,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4F7F2]">
      <Sidebar
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-h-screen lg:pl-72">
        <Navbar
          fullName={fullName}
          roleLabel={roleLabels[role]}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
