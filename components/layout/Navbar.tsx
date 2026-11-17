"use client";

import { Menu, Bell, UserCircle } from "lucide-react";

interface NavbarProps {
  fullName?: string;
  roleLabel: string;
  onMenuClick: () => void;
}

export default function Navbar({
  fullName,
  roleLabel,
  onMenuClick,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
        >
          <Menu size={23} />
        </button>

        <div>
          <h1 className="text-lg font-bold text-slate-800">
            WACCI Leave Management
          </h1>
          <p className="hidden text-xs text-slate-500 sm:block">
            Manage your leave activities and records
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-800">
            {fullName || "WACCI User"}
          </p>
          <p className="text-xs text-slate-500">{roleLabel}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#326536]/10 text-[#326536]">
          <UserCircle size={24} />
        </div>
      </div>
    </header>
  );
}
