"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

const getUTCDateString = (dateInput) => {
  const d = new Date(dateInput);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

const formatGroupDate = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getUTCDate();
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekday = weekdays[d.getUTCDay()];
  return `${day}-${month}-${year}(${weekday})`;
};

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
      const hwDate = getUTCDateString(hw.createdAt);
      return hwDate === selectedDate;
    }
    return true;
  });

  // Group by Date and Class
  const groupedHomeworks = useMemo(() => {
    const groups = {};
    filteredHomeworks.forEach((hw) => {
      const dateStr = getUTCDateString(hw.createdAt);
      const classStr = hw.className || "UNKNOWN";
      const key = `${dateStr}_${classStr}`;
      if (!groups[key]) {
        groups[key] = {
          date: dateStr,
          className: classStr,
          homeworks: [],
        };
      }
      groups[key].homeworks.push(hw);
    });
    return Object.values(groups).sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return a.className.localeCompare(b.className);
    });
  }, [filteredHomeworks]);



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
        <div className="space-y-8">
          {groupedHomeworks.map((group) => {
            const groupKey = `${group.date}_${group.className}`;
            return (
              <div
                key={groupKey}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Header matching image structure */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs tracking-wider text-slate-700 uppercase">
                      V-SCHOOL HOMEWORK
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Class Name (Cyan) */}
                    <div className="bg-cyan-500 text-white font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg shadow-sm tracking-widest uppercase">
                      {group.className?.toUpperCase()}
                    </div>

                    {/* Date label & value (Yellow) */}
                    <div className="flex items-center bg-yellow-400 text-slate-900 border border-yellow-500/20 rounded-lg shadow-sm overflow-hidden font-extrabold text-[11px] tracking-wider">
                      <span className="px-3 py-1.5 bg-yellow-500/20 text-slate-900/80 border-r border-yellow-500/10">
                        DATE
                      </span>
                      <span className="px-3 py-1.5">
                        {formatGroupDate(group.date).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Table structure (neat box structure) */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-rose-50/40 text-slate-900 border-b border-slate-200 divide-x divide-slate-200">
                        <th className="px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wider w-1/4">
                          SUBJECT
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wider w-1/2">
                          HOMEWORK
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wider w-1/4">
                          NOTEBOOKS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {group.homeworks.map((hw) => {
                        return (
                          <tr
                            key={hw.id}
                            className="divide-x divide-slate-200 hover:bg-slate-50/30 transition-colors"
                          >
                            {/* Subject Name (Bold, CAPS) */}
                            <td className="px-5 py-4 text-xs font-extrabold text-slate-900 uppercase tracking-wider bg-slate-50/20">
                              {hw.subject?.name?.toUpperCase()}
                            </td>

                            {/* Homework Description */}
                            <td className="px-5 py-4 text-sm text-slate-700 whitespace-pre-wrap font-normal leading-relaxed">
                              {hw.description}
                            </td>

                            {/* Notebooks needed */}
                            <td className="px-5 py-4 text-xs font-bold text-slate-800 bg-slate-50/5">
                              {hw.title?.toUpperCase()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
