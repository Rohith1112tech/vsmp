"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

function ParentHomeworkContent() {
  const { showToast } = useToast();
  const [children, setChildren] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [academicYear, setAcademicYear] = useState("2026-2027");

  const fetchHomeworkData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/parent/homework?academic_year=${academicYear}`);
      setHomeworks(res.homeworks || []);
      setChildren(res.children || []);
    } catch (err) {
      showToast(err.data?.error || "Failed to load homework log", "error");
    } finally {
      setLoading(false);
    }
  }, [academicYear, showToast]);

  useEffect(() => {
    fetchHomeworkData();
  }, [fetchHomeworkData]);

  // Find class name of the selected child
  const selectedChild = children.find((c) => String(c.id) === String(selectedChildId));
  
  // Filter homework based on selected child's class and assigned date
  const filteredHomeworks = homeworks.filter((hw) => {
    if (selectedChildId !== "all" && hw.className !== selectedChild?.className) {
      return false;
    }
    if (selectedDate) {
      const hwDate = new Date(hw.createdAt).toISOString().split("T")[0];
      return hwDate === selectedDate;
    }
    return true;
  });


  const getDaysRemaining = (dueDateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: "OVERDUE", style: "bg-red-50 text-red-700 border-red-200" };
    if (diffDays === 0) return { label: "DUE TODAY", style: "bg-amber-50 text-amber-700 border-amber-200" };
    if (diffDays === 1) return { label: "DUE TOMORROW", style: "bg-blue-50 text-blue-700 border-blue-200" };
    return { label: `DUE IN ${diffDays} DAYS`, style: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold text-slate-900 mb-1 tracking-wider uppercase bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-transparent">HOMEWORK</h1>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
          KEEP TRACK OF HOMEWORK ASSIGNMENTS POSTED BY ALL TEACHERS FOR YOUR CHILDREN.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          {/* Child Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              FILTER BY CHILD
            </label>
            {loading ? (
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            ) : (
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="all">ALL CHILDREN</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name?.toUpperCase()} ({c.className?.toUpperCase()})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Academic Year Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              FILTER BY ACADEMIC YEAR
            </label>
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

          {/* Date Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              FILTER BY ASSIGNED DATE
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Clear Buttons / Actions */}
          <div className="flex gap-2">
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate("")}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
              >
                SHOW ALL DATES
              </button>
            )}
            {selectedDate !== new Date().toISOString().split("T")[0] && (
              <button
                type="button"
                onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
              >
                GO TO TODAY
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Homework Grid / Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 animate-pulse">
              <div className="flex justify-between items-start">
                <div className="h-5 w-24 bg-slate-100 rounded-lg" />
                <div className="h-5 w-16 bg-slate-100 rounded-lg" />
              </div>
              <div className="h-6 w-3/4 bg-slate-100 rounded-lg" />
              <div className="space-y-2">
                <div className="h-4 bg-slate-100 rounded-lg" />
                <div className="h-4 bg-slate-100 rounded-lg" />
                <div className="h-4 w-5/6 bg-slate-100 rounded-lg" />
              </div>
              <div className="pt-4 border-t border-slate-100 h-10 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      ) : filteredHomeworks.length === 0 ? (
        <div className="py-16 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center p-6 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">NO HOMEWORK ASSIGNED</h3>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 max-w-md">
            NO HOMEWORK ASSIGNED {selectedDate ? `ON ${new Date(selectedDate).toLocaleDateString(undefined, { dateStyle: "medium" }).toUpperCase()}` : "AT THE MOMENT"} FOR {selectedChildId === "all" ? "ANY OF YOUR CHILDREN'S CLASSES" : `${selectedChild?.name?.toUpperCase()}'S CLASS (${selectedChild?.className?.toUpperCase()})`}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHomeworks.map((hw) => {
            const daysInfo = getDaysRemaining(hw.dueDate);

            return (
              <div
                key={hw.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col justify-between overflow-hidden"
              >
                {/* Card Top */}
                <div className="p-6 space-y-4 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                      {hw.subject?.name?.toUpperCase() || "SUBJECT"}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${daysInfo.style}`}>
                      {daysInfo.label}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CLASS {hw.className?.toUpperCase()}</p>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-normal">
                      {hw.description}
                    </p>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NOTEBOOK NEEDED</p>
                    <div className="text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200/60 px-3 py-2 rounded-xl">
                      {hw.title}
                    </div>
                  </div>
                </div>

                {/* Card Bottom Info */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                     <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      POSTED BY: <strong className="text-slate-700 font-bold">{hw.teacher?.name?.toUpperCase() || "TEACHER"}</strong>
                    </span>
                  </div>
                  


                  <div className="flex items-center justify-between text-[10px] mt-2 border-t border-slate-100/50 pt-2">
                    <span className="font-bold uppercase tracking-wider text-slate-400">ASSIGNED: {new Date(hw.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" }).toUpperCase()}</span>
                    <span className="font-bold uppercase tracking-wider text-slate-700">DUE: {new Date(hw.dueDate).toLocaleDateString(undefined, { dateStyle: "medium" }).toUpperCase()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ParentHomeworkPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-slate-100 rounded-lg mb-2" />
          <div className="h-5 w-72 bg-slate-100 rounded-lg" />
          <div className="bg-white rounded-2xl border border-slate-200 p-5 h-24" />
        </div>
      }
    >
      <ParentHomeworkContent />
    </Suspense>
  );
}
