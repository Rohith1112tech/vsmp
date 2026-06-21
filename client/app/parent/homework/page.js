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

  const fetchHomeworkData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/parent/homework");
      setHomeworks(res.homeworks || []);
      setChildren(res.children || []);
    } catch (err) {
      showToast(err.data?.error || "Failed to load homework log", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

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
    
    if (diffDays < 0) return { label: "Overdue", style: "bg-red-50 text-red-700 border-red-200" };
    if (diffDays === 0) return { label: "Due Today", style: "bg-amber-50 text-amber-700 border-amber-200" };
    if (diffDays === 1) return { label: "Due Tomorrow", style: "bg-blue-50 text-blue-700 border-blue-200" };
    return { label: `Due in ${diffDays} days`, style: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-1">Homework (HW)</h1>
        <p className="text-slate-500 text-sm">
          Keep track of homework assignments posted by all teachers for your children.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
          {/* Child Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Filter by Child
            </label>
            {loading ? (
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            ) : (
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="all">All Children</option>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.className})
                </option>
              ))}
            </select>
            )}
          </div>

          {/* Date Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Filter by Assigned Date
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
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
              >
                Show All Dates
              </button>
            )}
            {selectedDate !== new Date().toISOString().split("T")[0] && (
              <button
                type="button"
                onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition-all"
              >
                Go to Today
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
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-2xl">
            📓
          </div>
          <h3 className="text-lg font-semibold text-slate-800">No Homework Assigned</h3>
          <p className="text-sm text-slate-400 max-w-md">
            Excellent! There is no homework assigned {selectedDate ? `on ${new Date(selectedDate).toLocaleDateString(undefined, { dateStyle: "medium" })}` : "at the moment"} for {selectedChildId === "all" ? "any of your children's classes" : `${selectedChild?.name}'s class (${selectedChild?.className})`}.
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
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      📖 {hw.subject?.name || "Subject"}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${daysInfo.style}`}>
                      {daysInfo.label}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500">Class {hw.className}</p>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-normal">
                      {hw.description}
                    </p>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notebook Needed</p>
                    <div className="text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200/60 px-3 py-2 rounded-xl">
                      {hw.title}
                    </div>
                  </div>
                </div>

                {/* Card Bottom Info */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Posted by: <strong className="text-slate-700 font-semibold">{hw.teacher?.name || "Teacher"}</strong>
                    </span>
                  </div>
                  


                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 border-t border-slate-100/50 pt-2">
                    <span>Assigned: {new Date(hw.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
                    <span className="font-semibold text-slate-700">Due: {new Date(hw.dueDate).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
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
