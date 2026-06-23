"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const data = await apiClient.get("/admin/dashboard");
      setStats(data);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      showToast(err.data?.error || err.message || "Failed to load dashboard data", "error");
    } finally {
      setLoading(false);
    }
  }

  const statCards = stats
    ? [
        {
          label: "TOTAL STUDENTS",
          value: stats.totalStudents,
          href: "/admin/students",
        },
        {
          label: "TOTAL TEACHERS",
          value: stats.totalTeachers,
          href: "/admin/teachers",
        },
        {
          label: "TOTAL SUBJECTS",
          value: stats.totalSubjects,
          href: "/admin/subjects",
        },
        {
          label: "TOTAL CLASSES",
          value: stats.totalClasses,
          href: "/admin/classes",
        },
      ]
    : [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-semibold text-slate-900 mb-1 tracking-wider uppercase bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-transparent">
          DASHBOARD
        </h1>
        <p className="text-slate-500">
          Welcome back, {(user?.name || user?.auth_identifier || "ADMIN").toUpperCase()}. Here&apos;s your school overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {loading
          ? [...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center text-center"
              >
                <div className="h-4.5 w-24 bg-slate-100 rounded animate-pulse mb-2.5" />
                <div className="h-9 w-16 bg-slate-100 rounded-lg animate-pulse" />
              </div>
            ))
          : statCards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer block text-center group"
              >
                <p className="text-[10px] font-bold text-slate-400 group-hover:text-slate-500 transition-colors tracking-widest uppercase mb-1">
                  {card.label}
                </p>
                <p className="text-4xl font-black text-slate-900 tracking-tight">
                  {card.value}
                </p>
              </Link>
            ))}
      </div>
    </div>
  );
}
