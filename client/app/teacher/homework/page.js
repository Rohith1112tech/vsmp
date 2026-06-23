"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { compareClassNames } from "@/lib/classSort";
import { useToast } from "@/components/ui/Toast";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function TeacherHomeworkPage() {
  const { showToast } = useToast();
  const [homeworks, setHomeworks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form states
  const [form, setForm] = useState({
    className: "",
    subjectId: "",
    title: "",
    description: "",
    dueDate: "",
    academic_year: "2026-2027",
  });
  const [academicYearFilter, setAcademicYearFilter] = useState("2026-2027");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const query = academicYearFilter ? `?academic_year=${academicYearFilter}` : "";
      const [homeworksRes, dashboardRes] = await Promise.all([
        apiClient.get(`/teacher/homework${query}`),
        apiClient.get("/teacher/dashboard"),
      ]);
      setHomeworks(homeworksRes || []);
      setAssignments(dashboardRes.assignments || []);
    } catch (err) {
      showToast(err.data?.error || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [academicYearFilter, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Extract unique classes assigned to this teacher
  const classes = [...new Set(assignments.map((a) => a.className))].sort(compareClassNames);

  // Filter subjects based on selected class in form
  const availableSubjects = assignments
    .filter((a) => a.className === form.className && a.subject)
    .map((a) => a.subject);

  function openAddModal() {
    setIsEditing(false);
    setEditingId(null);
    // Default to tomorrow's date for due date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    setForm({
      className: classes[0] || "",
      subjectId: "",
      title: "",
      description: "",
      dueDate: tomorrowStr,
      academic_year: "2026-2027",
    });
    setModalOpen(true);
  }

  function openEditModal(hw) {
    setIsEditing(true);
    setEditingId(hw.id);
    const dueDateStr = new Date(hw.dueDate).toISOString().split("T")[0];

    setForm({
      className: hw.className,
      subjectId: hw.subjectId.toString(),
      title: hw.title,
      description: hw.description,
      dueDate: dueDateStr,
      academic_year: hw.academicYear || hw.academic_year || "2026-2027",
    });
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/teacher/homework/${deleteTarget.id}`);
      showToast("Homework record deleted successfully", "success");
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      showToast(err.data?.error || "Failed to delete homework", "error");
    }
  }

  // Auto-select first subject when class changes
  useEffect(() => {
    if (form.className) {
      const subjects = assignments.filter((a) => a.className === form.className && a.subject);
      if (subjects.length > 0) {
        setForm((f) => ({ ...f, subjectId: subjects[0].subject.id.toString() }));
      } else {
        setForm((f) => ({ ...f, subjectId: "" }));
      }
    }
  }, [form.className, assignments]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.className) {
      showToast("Class is required", "warning");
      return;
    }
    if (!form.subjectId) {
      showToast("Subject is required", "warning");
      return;
    }
    if (!form.title.trim()) {
      showToast("Title is required", "warning");
      return;
    }
    if (!form.description.trim()) {
      showToast("Description is required", "warning");
      return;
    }
    if (!form.dueDate) {
      showToast("Due Date is required", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        className: form.className,
        subjectId: parseInt(form.subjectId, 10),
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate,
        academic_year: form.academic_year,
      };

      if (isEditing) {
        await apiClient.put(`/teacher/homework/${editingId}`, payload);
        showToast("Homework updated successfully", "success");
      } else {
        await apiClient.post("/teacher/homework", payload);
        showToast("Homework assigned successfully", "success");
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.data?.error || `Failed to ${isEditing ? "update" : "assign"} homework`, "error");
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      key: "className",
      label: "CLASS",
      render: (row) => (
        <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg text-xs uppercase tracking-wider">
          {row.className}
        </span>
      ),
    },
    {
      key: "subject",
      label: "SUBJECT",
      render: (row) => (
        <span className="font-medium text-slate-700">{(row.subject?.name || '—').toUpperCase()}</span>
      ),
    },
    {
      key: "title",
      label: "NOTEBOOKS",
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.title}</div>
          <div className="text-xs text-slate-500 max-w-sm truncate" title={row.description}>
            {row.description}
          </div>
        </div>
      ),
    },
    {
      key: "dueDate",
      label: "DUE DATE",
      render: (row) => {
        const isPast = new Date(row.dueDate) < new Date().setHours(0, 0, 0, 0);
        return (
          <span className={`text-xs font-semibold ${isPast ? "text-red-600" : "text-emerald-700"}`}>
            {new Date(row.dueDate).toLocaleDateString(undefined, {
              dateStyle: "medium",
            })}
            {isPast && " (OVERDUE)"}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      label: "POSTED DATE",
      render: (row) => (
        <span className="text-slate-500 text-xs">
          {new Date(row.createdAt).toLocaleDateString(undefined, {
            dateStyle: "medium",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      label: "ACTIONS",
      render: (row) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Edit homework"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete homework"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-slate-900 mb-1 tracking-wider uppercase bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-transparent">HOMEWORK</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            ASSIGN AND TRACK HOMEWORK FOR YOUR STUDENT CLASSES.
          </p>
        </div>
        <button
          onClick={openAddModal}
          disabled={classes.length === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-200 shadow-sm shadow-blue-500/20 hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          POST HOMEWORK
        </button>
      </div>

      {/* Homework List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">HOMEWORK ASSIGNMENTS LOG</h2>
          
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">ACADEMIC YEAR:</label>
            <select
              value={academicYearFilter}
              onChange={(e) => setAcademicYearFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[120px] uppercase tracking-wider"
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
            </select>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={homeworks}
          loading={loading}
          emptyMessage="NO HOMEWORK RECORDS FOUND."
          searchable
          searchPlaceholder="SEARCH NOTEBOOKS..."
        />
      </div>

      {/* Post Homework Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={isEditing ? "EDIT HOMEWORK" : "POST HOMEWORK"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                CLASS *
              </label>
              <select
                value={form.className}
                onChange={(e) => setForm({ ...form, className: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c?.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                ACADEMIC YEAR *
              </label>
              <select
                value={form.academic_year}
                onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2027-2028">2027-2028</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                SUBJECT *
              </label>
              <select
                value={form.subjectId}
                onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="">SELECT SUBJECT...</option>
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name?.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              NOTEBOOKS *
            </label>
            <input
              type="text"
              required
              placeholder="E.G. 192 PAGES RULING, PHYSICS HOMEWORK NOTEBOOK"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1 uppercase font-semibold tracking-wide">SPECIFY WHAT NOTEBOOK THE STUDENTS NEED FOR THIS HOMEWORK.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              DESCRIPTION / INSTRUCTIONS *
            </label>
            <textarea
              required
              rows={4}
              placeholder="WRITE THE QUESTIONS, PAGES TO READ, OR SUBMISSION GUIDELINES..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              DUE DATE *
            </label>
            <input
              type="date"
              required
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-5 py-2.5 text-xs font-bold tracking-wider uppercase text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-bold tracking-wider uppercase text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-200 shadow-sm disabled:opacity-50"
            >
              {submitting ? (isEditing ? "SAVING..." : "ASSIGNING...") : (isEditing ? "SAVE CHANGES" : "ASSIGN HOMEWORK")}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="DELETE HOMEWORK"
        message={`ARE YOU SURE YOU WANT TO DELETE THIS HOMEWORK? THIS CANNOT BE UNDONE.`}
        confirmText="DELETE"
        type="danger"
      />
    </div>
  );
}
