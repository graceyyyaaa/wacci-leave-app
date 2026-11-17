"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  FilePlus2,
  History,
  Users,
  Building2,
  FileText,
  BarChart3,
  ClipboardCheck,
  UserCircle,
  LogOut,
  X,
} from "lucide-react";

type UserRole = "staff" | "admin" | "director";

interface SidebarProps {
  role: UserRole;
  open: boolean;
  onClose: () => void;
}

const navigation = {
  staff: [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Apply for Leave",
      href: "/leave",
      icon: FilePlus2,
    },
    {
      label: "Leave History",
      href: "/history",
      icon: History,
    },
    {
      label: "My Profile",
      href: "/profile",
      icon: UserCircle,
    },
  ],

  admin: [
    {
      label: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      label: "Staff Management",
      href: "/admin/staff",
      icon: Users,
    },
    {
      label: "Departments",
      href: "/admin/departments",
      icon: Building2,
    },
    {
      label: "Leave Records",
      href: "/admin/leave-records",
      icon: FileText,
    },
    {
      label: "Reports",
      href: "/admin/reports",
      icon: BarChart3,
    },
    {
      label: "My Profile",
      href: "/admin/profile",
      icon: UserCircle,
    },
  ],

  director: [
    {
      label: "Dashboard",
      href: "/director",
      icon: LayoutDashboard,
    },
    {
      label: "Pending Approvals",
      href: "/director/approvals",
      icon: ClipboardCheck,
    },
    {
      label: "Reviewed Requests",
      href: "/director/reviewed",
      icon: History,
    },
    {
      label: "Staff Leave Records",
      href: "/director/records",
      icon: FileText,
    },
    {
      label: "My Profile",
      href: "/director/profile",
      icon: UserCircle,
    },
  ],
};

export default function Sidebar({ role, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const roleLabel = {
    staff: "Staff Portal",
    admin: "Main Admin",
    director: "Director Portal",
  };

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Sign out error:", error.message);
      return;
    }

    onClose();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      {open && (
        <button
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#326536] text-white transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo and Branding */}
        <div className="flex h-20 items-center justify-between border-b border-white/15 px-6">
          <div>
            <h2 className="text-xl font-bold tracking-wide">WACCI</h2>
            <p className="mt-1 text-xs text-white/70">
              Leave Management System
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Workspace */}
        <div className="px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#C4DD5A]">
            Workspace
          </p>

          <p className="mt-2 text-sm font-medium">{roleLabel[role]}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-4">
          {navigation[role].map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                item.href !== "/admin" &&
                item.href !== "/director" &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-[#C4DD5A] text-[#173D20]"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="border-t border-white/15 p-4">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut size={19} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
