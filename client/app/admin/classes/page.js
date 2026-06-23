"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const GRADES = [
  { roman: "I", num: "1" },
  { roman: "II", num: "2" },
  { roman: "III", num: "3" },
  { roman: "IV", num: "4" },
  { roman: "V", num: "5" },
  { roman: "VI", num: "6" },
  { roman: "VII", num: "7" },
  { roman: "VIII", num: "8" },
  { roman: "IX", num: "9" },
  { roman: "X", num: "10" },
  { roman: "XI", num: "11" },
  { roman: "XII", num: "12" }
];
const COLORS = ["YELLOW", "PINK", "BLUE"];

export default function ClassesPage() {
  const { showToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  // Tabs and quick select state
  const [activeTab, setActiveTab] = useState("manual"); // "manual" or "quick"
  const [selectedGradeNum, setSelectedGradeNum] = useState("");
  const [selectedColor, setSelectedColor] = useState("");

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/admin/classes");
      setClasses(Array.isArray(res) ? res : []);
    } catch (err) {
      showToast(err.data?.error || "Failed to load classes", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) {
      showToast("Class name is required", "warning");
      return;
    }
    try {
      setAdding(true);
      await apiClient.post("/admin/classes", { name: newName.trim() });
      showToast(`Class "${newName.trim()}" created`, "success");
      setNewName("");
      fetchClasses();
    } catch (err) {
      showToast(err.data?.error || "Failed to create class", "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleQuickAdd() {
    if (!selectedGradeNum || !selectedColor) {
      showToast("Please select both a grade and a color", "warning");
      return;
    }
    const classFullName = `${selectedGradeNum}-${selectedColor}`;
    try {
      setAdding(true);
      await apiClient.post("/admin/classes", { name: classFullName });
      showToast(`Class "${classFullName}" created`, "success");
      setSelectedGradeNum("");
      setSelectedColor("");
      fetchClasses();
    } catch (err) {
      showToast(err.data?.error || "Failed to create class", "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/admin/classes/${deleteTarget.id}`);
      showToast(`Class "${deleteTarget.name}" deleted`, "success");
      setDeleteTarget(null);
      fetchClasses();
    } catch (err) {
      showToast(err.data?.error || "Failed to delete class", "error");
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1 tracking-wider uppercase bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-transparent">CLASSES</h1>
        <p className="text-slate-500">Manage school classes and sections</p>
      </div>

      {/* Add Class Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-sm font-bold tracking-wider uppercase text-slate-900">ADD NEW CLASS</h2>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("manual")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
                activeTab === "manual"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              MANUAL TYPE
            </button>
            <button
              onClick={() => setActiveTab("quick")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
                activeTab === "quick"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              QUICK SELECTOR
            </button>
          </div>
        </div>

        {activeTab === "manual" ? (
          <form onSubmit={handleAdd} className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value.toUpperCase())}
                placeholder="E.G. 10-A, 9-B, CLASS 8"
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-wider uppercase rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  ADDING...
                </>
              ) : (
                "ADD CLASS"
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Roman Letters Selector */}
              <div>
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  SELECT GRADE (1 - 12)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {GRADES.map((grade) => (
                    <button
                      key={grade.roman}
                      type="button"
                      onClick={() => setSelectedGradeNum(grade.num)}
                      className={`py-2 text-sm font-semibold rounded-xl border transition-all duration-200 ${
                        selectedGradeNum === grade.num
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      {grade.num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  SELECT SECTION / COLOR
                </span>
                <div className="flex flex-col gap-2">
                  {COLORS.map((col) => {
                    let colorStyles = "";
                    if (col === "YELLOW") {
                      colorStyles = selectedColor === col 
                        ? "bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-500/20" 
                        : "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800";
                    } else if (col === "PINK") {
                      colorStyles = selectedColor === col 
                        ? "bg-rose-500 border-rose-500 text-white shadow-sm shadow-rose-500/20" 
                        : "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800";
                    } else if (col === "BLUE") {
                      colorStyles = selectedColor === col 
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/20" 
                        : "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800";
                    }
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setSelectedColor(col)}
                        className={`py-2 px-4 text-sm font-semibold rounded-xl border text-left transition-all duration-200 flex items-center justify-between uppercase ${colorStyles}`}
                      >
                        <span>{col}</span>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.toLowerCase() }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Preview and Submit */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="text-xs font-bold uppercase tracking-wider">
                <span className="text-slate-500">PREVIEW: </span>
                {selectedGradeNum && selectedColor ? (
                  <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg animate-pulse">
                    {selectedGradeNum}-{selectedColor}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">SELECT GRADE AND COLOR</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={adding || !selectedGradeNum || !selectedColor}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-wider uppercase rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    ADDING...
                  </>
                ) : (
                  "ADD CLASS"
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Classes List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wider uppercase text-slate-900">ALL CLASSES</h2>
          {!loading && (
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full uppercase">
              {classes.length} {classes.length === 1 ? "CLASS" : "CLASSES"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
                <div className="flex-1 h-5 w-32 bg-slate-100 rounded-lg animate-pulse" />
                <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-base font-semibold text-slate-900 mb-1 uppercase tracking-wide">NO CLASSES YET</h3>
            <p className="text-sm text-slate-500 uppercase tracking-wide text-xs">ADD YOUR FIRST CLASS ABOVE TO GET STARTED.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {classes.map((cls, idx) => (
              <div
                key={cls.id}
                className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50/60 ${
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                }`}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-base font-bold flex-shrink-0">
                  {cls.name.charAt(0).toUpperCase()}
                </div>

                {/* Name */}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 uppercase tracking-wide">{cls.name.toUpperCase()}</p>
                  <p className="text-xs text-slate-400 mt-0.5 uppercase">
                    ADDED {new Date(cls.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }).toUpperCase()}
                  </p>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => setDeleteTarget(cls)}
                  className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete class"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="DELETE CLASS"
        message={`Are you sure you want to delete class "${deleteTarget?.name?.toUpperCase()}"? This won't affect existing students or assignments.`}
        confirmText="DELETE CLASS"
        type="danger"
      />
    </div>
  );
}
