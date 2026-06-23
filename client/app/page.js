"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated && user?.role) {
      const role = user.role.toLowerCase();
      router.push(`/${role}/dashboard`);
    } else {
      router.push("/login");
    }
  }, [loading, isAuthenticated, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center gradient-mesh">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        {/* Logo / Icon */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-2xl shadow-slate-200 border border-slate-100">
            <img src="/logo.png" alt="Logo" className="w-13 h-13 object-contain" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-emerald-500/10 opacity-20 blur-lg" />
        </div>

        {/* Loading spinner */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-indigo-600 animate-spin" />
        </div>

        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-1">
            School Management Platform
          </h1>
          <p className="text-sm text-slate-600">Loading your experience...</p>
        </div>
      </div>
    </div>
  );
}
