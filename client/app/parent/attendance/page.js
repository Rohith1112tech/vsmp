"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useSearchParams } from "next/navigation";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

function AttendanceContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const childParam = searchParams.get("child");

  const now = new Date();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(childParam || "");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [attendance, setAttendance] = useState(null);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [academicYear, setAcademicYear] = useState("2026-2027");

  // Fetch children list
  useEffect(() => {
    async function fetchChildren() {
      try {
        const res = await apiClient.get("/parent/children");
        setChildren(res.children || []);
        // Auto-select from query param or first child
        if (childParam && res.children?.some((c) => String(c.id) === String(childParam))) {
          setSelectedChild(String(childParam));
        } else if (res.children?.length > 0 && !selectedChild) {
          setSelectedChild(String(res.children[0].id));
        }
      } catch (err) {
        showToast(err.data?.error || "Failed to load children", "error");
      } finally {
        setLoadingChildren(false);
      }
    }
    fetchChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  // Fetch attendance when child/month/year/academicYear changes
  const fetchAttendance = useCallback(async () => {
    if (!selectedChild) return;
    setLoadingAttendance(true);
    try {
      const res = await apiClient.get(
        `/parent/children/${selectedChild}/attendance?month=${month}&year=${year}&academic_year=${academicYear}`
      );
      setAttendance(res);
    } catch (err) {
      showToast(err.data?.error || "Failed to load attendance", "error");
      setAttendance(null);
    } finally {
      setLoadingAttendance(false);
    }
  }, [selectedChild, month, year, academicYear, showToast]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const getPercentageColor = (pct) => {
    if (pct >= 90) return { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" };
    if (pct >= 75) return { bar: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" };
    if (pct >= 50) return { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" };
    return { bar: "bg-red-500", text: "text-red-700", bg: "bg-red-50" };
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getDayOfWeek = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { weekday: "long" });
  };

  // Generate year options (current year and 2 previous)
  const yearOptions = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) {
    yearOptions.push(y);
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-semibold text-slate-900 mb-1 tracking-wider uppercase bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-transparent">ATTENDANCE RECORDS</h1>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">TRACK YOUR CHILD&apos;S DAILY ATTENDANCE.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Child selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">CHILD</label>
            {loadingChildren ? (
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            ) : (
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">SELECT A CHILD</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name?.toUpperCase()} — {child.className?.toUpperCase()}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Academic Year selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">FILTER BY ACADEMIC YEAR</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
            </select>
          </div>

          {/* Month selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">MONTH</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Year selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">YEAR</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {!selectedChild ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <span className="text-5xl mb-4 block">👆</span>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a Child</h3>
          <p className="text-slate-500">Choose a child above to view their attendance records.</p>
        </div>
      ) : loadingAttendance ? (
        <div className="space-y-6">
          {/* Summary skeleton */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
          {/* Records skeleton */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <div className="h-5 w-32 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-5 w-20 bg-slate-100 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : attendance ? (
        <div className="space-y-6">
          {/* Student info */}
          {attendance.student && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-lg font-bold">
                {(attendance.student.name?.charAt(0) || "S").toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">{attendance.student.name?.toUpperCase()}</h3>
                <p className="text-sm text-slate-500">
                  {attendance.student.className?.toUpperCase()} &bull; {MONTHS.find((m) => m.value === attendance.month)?.label} {attendance.year}
                </p>
              </div>
            </div>
          )}

          {/* Summary cards */}
          {attendance.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-center">
                <p className="text-3xl font-bold text-slate-900">{attendance.summary.total}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">TOTAL DAYS</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-center">
                <p className="text-3xl font-bold text-emerald-600">{attendance.summary.present}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mt-1">PRESENT</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-center">
                <p className="text-3xl font-bold text-red-600">{attendance.summary.absent}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-red-600 mt-1">ABSENT</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-center">
                {(() => {
                  const pct = Number(attendance.summary.percentage) || 0;
                  const colors = getPercentageColor(pct);
                  return (
                    <>
                      <p className={`text-3xl font-bold ${colors.text}`}>{pct.toFixed(1)}%</p>
                      <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${colors.text}`}>ATTENDANCE %</p>
                    </>
                  );
                })()}
              </div>
            </div>
          )}



          {/* Attendance records */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">DAILY RECORDS</h3>
            </div>
            {attendance.attendance?.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">NO ATTENDANCE RECORDS FOUND FOR THIS PERIOD.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {attendance.attendance?.map((record, idx) => (
                  <div
                    key={idx}
                    className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                        {new Date(record.date).getDate()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{formatDate(record.date)}</p>
                        <p className="text-xs text-slate-400">{getDayOfWeek(record.date)}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        record.status === "PRESENT"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {record.status === "PRESENT" ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      {record.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <span className="text-5xl mb-4 block">📅</span>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Data Available</h3>
          <p className="text-slate-500">No attendance data found for the selected period.</p>
        </div>
      )}
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-56 bg-slate-100 rounded-lg animate-pulse mb-2" />
            <div className="h-5 w-72 bg-slate-100 rounded-lg animate-pulse" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <AttendanceContent />
    </Suspense>
  );
}
