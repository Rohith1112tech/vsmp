"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";

export default function TeacherStudentsPage() {
  const { showToast } = useToast();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    parent_mobile: "",
  });

  // Load teacher details and classes
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [classesRes, dashboardRes] = await Promise.all([
        apiClient.get("/teacher/my-classes"),
        apiClient.get("/teacher/dashboard"),
      ]);
      setClasses(classesRes.classes || []);
      setAssignments(dashboardRes.assignments || []);
      if (classesRes.classes?.length > 0) {
        setSelectedClass(classesRes.classes[0]);
      }
    } catch (err) {
      showToast(err.data?.error || "Failed to load classes", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load students for selected class
  const loadStudents = useCallback(async () => {
    if (!selectedClass) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/teacher/students?class_name=${encodeURIComponent(selectedClass)}`);
      setStudents(res.students || []);
    } catch (err) {
      showToast(err.data?.error || "Failed to load students", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedClass, showToast]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Check if current teacher is the Class Teacher for the selected class
  const isClassTeacherOfSelected = assignments.some(
    (a) => a.className === selectedClass && a.role === "CLASS_TEACHER"
  );

  function openAddModal() {
    setForm({ name: "", parent_mobile: "" });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast("Name is required", "warning");
      return;
    }
    if (!form.parent_mobile.trim()) {
      showToast("Parent mobile is required", "warning");
      return;
    }
    if (!/^\d{10}$/.test(form.parent_mobile.trim())) {
      showToast("Parent mobile must be a 10-digit number", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        class_name: selectedClass,
        parent_mobile: form.parent_mobile.trim(),
      };
      const res = await apiClient.post("/teacher/students", payload);
      const resetCode = res.student?.parent?.resetCode;
      if (resetCode) {
        showToast(`Student added. Parent Reset Code: ${resetCode}`, "success");
      } else {
        showToast("Student added successfully", "success");
      }
      setModalOpen(false);
      loadStudents();
    } catch (err) {
      showToast(err.data?.error || "Failed to add student", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      key: "name",
      label: "Student Name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold">
            {(row.name || '?').charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-slate-800">{row.name || '—'}</span>
        </div>
      ),
    },
    {
      key: "parentMobile",
      label: "Parent Mobile",
      render: (row) => (
        <span className="text-slate-500 font-mono text-xs">{row.parentMobile || row.parent_mobile || "—"}</span>
      ),
    },
    {
      key: "parentResetCode",
      label: "Parent Reset Code",
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold font-mono">
          {row.parent?.resetCode || "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-1">Students</h1>
          <p className="text-slate-500 text-sm">
            View student list and register new students (Class Teachers only).
          </p>
        </div>
        {isClassTeacherOfSelected && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Student
          </button>
        )}
      </div>

      {/* Class Selector Dropdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Select Class
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="">Choose Class...</option>
            {classes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {selectedClass && (
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between animate-fade-in">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Role in Class
            </span>
            <div className="mt-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-xl text-sm font-bold border ${
                isClassTeacherOfSelected 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}>
                {isClassTeacherOfSelected ? "🏫 Class Teacher" : "📖 Subject Teacher"}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
              {isClassTeacherOfSelected 
                ? "You can add students to this class section." 
                : "Only the designated Class Teacher can add students."}
            </p>
          </div>
        )}
      </div>

      {/* Student List Table */}
      {selectedClass ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-6 space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Students in {selectedClass}
            </h2>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {students.length} students
            </span>
          </div>

          <DataTable
            columns={columns}
            data={students}
            loading={loading}
            emptyMessage={`No student records found in ${selectedClass}.`}
            searchable
            searchPlaceholder="Search class students..."
          />
        </div>
      ) : (
        <div className="py-12 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center p-6 space-y-2">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-xl">
            👥
          </div>
          <h3 className="text-sm font-semibold text-slate-800">No Class Selected</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            Please choose a class from the dropdown above to view student directories.
          </p>
        </div>
      )}

      {/* Add Student Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Add Student to Class ${selectedClass}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter student's full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Class
            </label>
            <input
              type="text"
              value={selectedClass}
              disabled
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Parent Mobile *
            </label>
            <input
              type="tel"
              value={form.parent_mobile}
              onChange={(e) =>
                setForm({
                  ...form,
                  parent_mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                })
              }
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="10-digit mobile number"
              maxLength={10}
              required
            />
            {form.parent_mobile && form.parent_mobile.length < 10 && (
              <p className="text-xs text-amber-600 mt-1">
                {10 - form.parent_mobile.length} more digits needed
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Add Student"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
