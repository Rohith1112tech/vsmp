"use client";

import { useState } from "react";
import RoleGuard from "@/components/auth/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/ui/Modal";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

const NAV_ITEMS = [
  { label: "DASHBOARD",     href: "/admin/dashboard" },
  { label: "TEACHERS",      href: "/admin/teachers" },
  { label: "CLASS TEACHER", href: "/admin/assign" },
  { label: "STUDENTS",      href: "/admin/students" },
  { label: "RECORD",        href: "/admin/student-record" },
  { label: "ANNOUNCEMENTS", href: "/admin/announcements" },
  { label: "CLASSES",       href: "/admin/classes" },
  { label: "SUBJECTS",      href: "/admin/subjects" },
];

function AdminShell({ children }) {
  const { user, logout, updateUser } = useAuth();
  const { showToast } = useToast();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Admin Settings states
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function openSettings() {
    setEmailInput(user?.auth_identifier || "");
    setNameInput(user?.name || "");
    setPasswordInput("");
    setConfirmPasswordInput("");
    setShowPassword(false);
    setSettingsModalOpen(true);
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const form = e.target.form;
      if (!form) return;
      
      const index = Array.prototype.indexOf.call(form.elements, e.target);
      if (index === -1) return;
      
      let nextIndex = index + 1;
      while (nextIndex < form.elements.length) {
        const nextEl = form.elements[nextIndex];
        if (
          nextEl &&
          !nextEl.disabled &&
          nextEl.type !== "hidden" &&
          (nextEl.tagName === "INPUT" || nextEl.tagName === "BUTTON")
        ) {
          if (nextEl.type === "submit") {
            return;
          }
          if (nextEl.type === "button" && nextEl.className.includes("absolute")) {
            nextIndex++;
            continue;
          }
          e.preventDefault();
          nextEl.focus();
          return;
        }
        nextIndex++;
      }
    }
  };

  async function handleSaveSettings(e) {
    e.preventDefault();
    if (!emailInput.trim()) {
      showToast("Email is required", "warning");
      return;
    }
    if (passwordInput && passwordInput !== confirmPasswordInput) {
      showToast("Passwords do not match", "warning");
      return;
    }

    try {
      setUpdatingSettings(true);
      const payload = { 
        email: emailInput.trim(),
        name: nameInput.trim()
      };
      if (passwordInput) {
        payload.password = passwordInput;
      }
      
      await apiClient.put("/admin/profile", payload);
      
      updateUser({ 
        auth_identifier: emailInput.trim(),
        name: nameInput.trim()
      });
      showToast("Profile settings updated successfully", "success");
      setSettingsModalOpen(false);
    } catch (err) {
      showToast(err.data?.error || "Failed to update profile", "error");
    } finally {
      setUpdatingSettings(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-blue-900 flex flex-col flex-shrink-0 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">SMP</h1>
              <p className="text-[10px] text-blue-300 font-medium uppercase tracking-widest">Admin Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wider transition-all duration-200 ${
                  isActive
                    ? "bg-white/10 text-white border-l-4 border-white -ml-px"
                    : "text-blue-200 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-blue-800">
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-white truncate tracking-wide">
              {(user?.auth_identifier || "ADMIN").toUpperCase()}
            </p>
            <p className="text-[9px] text-blue-300 font-bold uppercase tracking-widest mt-0.5">
              ADMINISTRATOR
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={openSettings}
              className="flex items-center justify-center px-3 py-2 text-[10px] font-bold tracking-wider uppercase text-blue-200 hover:text-white hover:bg-white/10 rounded-xl bg-white/5 transition-all duration-200"
            >
              <span>SETTINGS</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center justify-center px-3 py-2 text-[10px] font-bold tracking-wider uppercase text-blue-200 hover:text-white hover:bg-white/10 rounded-xl bg-white/5 transition-all duration-200"
            >
              <span>SIGN OUT</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:pl-64 min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <svg
              className="w-6 h-6 text-slate-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1 className="text-sm font-bold text-slate-900">SMP Admin</h1>
        </div>
        {children}
      </main>

      {/* Admin Settings Modal */}
      <Modal isOpen={settingsModalOpen} onClose={() => { setSettingsModalOpen(false); setShowPassword(false); }} title="ADMIN SETTINGS">
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase">
              Full Name
            </label>
            <input
              type="text"
              placeholder=""
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase">
              Email Address / Login ID
            </label>
            <input
              type="email"
              required
              placeholder=""
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              New Password (leave blank to keep current)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder=""
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 pr-11 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none select-none"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" x2="22" y1="2" y2="22" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder=""
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 pr-11 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none select-none"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" x2="22" y1="2" y2="22" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setSettingsModalOpen(false); setShowPassword(false); }}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingSettings}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-200 shadow-sm disabled:opacity-50"
            >
              {updatingSettings ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <RoleGuard allowedRole="ADMIN">
      <AdminShell>{children}</AdminShell>
    </RoleGuard>
  );
}