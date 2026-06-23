"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function StudentsPage() {
  const { showToast } = useToast();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [classFilter, setClassFilter] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState("2026-2027");
  const [form, setForm] = useState({
    name: "",
    class_name: "",
    parent_mobile: "",
    academic_year: "2026-2027",
  });

  const fetchClasses = useCallback(async () => {
    try {
      const res = await apiClient.get("/admin/classes");
      setClasses(res || []);
    } catch (err) {
      console.error("Failed to load classes:", err);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("limit", "100");
      if (classFilter) params.append("class", classFilter);
      if (academicYearFilter && academicYearFilter !== "All Years") {
        params.append("academic_year", academicYearFilter);
      }
      const res = await apiClient.get(`/admin/students?${params.toString()}`);
      setStudents(res.data || res);
    } catch (err) {
      showToast(err.data?.error || "Failed to load students", "error");
    } finally {
      setLoading(false);
    }
  }, [classFilter, academicYearFilter, showToast]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  function openAddModal() {
    setEditingStudent(null);
    setForm({ name: "", class_name: "", parent_mobile: "", academic_year: "2026-2027" });
    setModalOpen(true);
  }

  function openEditModal(student) {
    setEditingStudent(student);
    setForm({
      name: student.name,
      class_name: student.className || student.class_name,
      parent_mobile: student.parentMobile || student.parent_mobile || "",
      academic_year: student.academicYear || student.academic_year || "2026-2027",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.class_name.trim()) {
      showToast("Name and Class are required", "warning");
      return;
    }
    if (!form.parent_mobile.trim()) {
      showToast("Parent mobile number is required", "warning");
      return;
    }
    if (!/^\d{10}$/.test(form.parent_mobile.trim())) {
      showToast("Parent mobile must be a 10-digit number", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: form.name.trim(),
        class_name: form.class_name.trim(),
        parent_mobile: form.parent_mobile.trim(),
        academic_year: form.academic_year,
      };

      if (editingStudent) {
        await apiClient.put(`/admin/students/${editingStudent.id}`, payload);
        showToast("Student updated successfully", "success");
      } else {
        const newStudent = await apiClient.post("/admin/students", payload);
        const resetCode = newStudent?.parent?.resetCode;
        if (resetCode) {
          showToast(`Student added. Parent Reset Code: ${resetCode}`, "success");
        } else {
          showToast("Student added successfully", "success");
        }
      }
      setModalOpen(false);
      fetchStudents();
    } catch (err) {
      showToast(err.data?.error || "Operation failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/admin/students/${deleteTarget.id}`);
      showToast("Student deleted successfully", "success");
      setDeleteTarget(null);
      fetchStudents();
    } catch (err) {
      showToast(err.data?.error || "Failed to delete student", "error");
    }
  }

  const columns = [
    {
      key: "name",
      label: "NAME",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold uppercase">
            {(row.name || '?').charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-slate-900 uppercase tracking-wide">{row.name?.toUpperCase() || '—'}</span>
        </div>
      ),
    },
    {
      key: "className",
      label: "CLASS",
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold uppercase">
          {(row.className || row.class_name || "").toUpperCase()}
        </span>
      ),
    },
    {
      key: "parentMobile",
      label: "PARENT MOBILE",
      render: (row) => (
        <span className="text-slate-600 text-sm font-mono">
          {row.parentMobile || row.parent_mobile || "—"}
        </span>
      ),
    },
    {
      key: "parentResetCode",
      label: "PARENT RESET CODE",
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold font-mono">
          {row.parent?.resetCode || "—"}
        </span>
      ),
    },
    {
      key: "academicYear",
      label: "ACADEMIC YEAR",
      render: (row) => (
        <span className="text-slate-600 text-xs font-bold uppercase tracking-wider">
          {row.academicYear || row.academic_year || "—"}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-wider uppercase bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-transparent">STUDENTS</h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage your school&apos;s student records
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-wider rounded-xl shadow-sm transition-colors uppercase"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            ADD NEW STUDENT
          </button>
        </div>

        {/* Filters */}
        <div className="mb-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2.5">
            <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              CLASS:
            </label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px] uppercase tracking-wider"
            >
              <option value="">ALL CLASSES</option>
              {classes.map((cls) => {
                const name = cls.name || cls;
                return (
                  <option key={name} value={name} className="uppercase">{name.toUpperCase()}</option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            <label className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              ACADEMIC YEAR:
            </label>
            <select
              value={academicYearFilter}
              onChange={(e) => setAcademicYearFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px] uppercase tracking-wider"
            >
              <option value="All Years">ALL YEARS</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
            </select>
          </div>

          {(classFilter || academicYearFilter !== "2026-2027") && (
            <button
              onClick={() => {
                setClassFilter("");
                setAcademicYearFilter("2026-2027");
              }}
              className="text-xs font-extrabold tracking-wider text-blue-600 hover:text-blue-700 uppercase"
            >
              RESET FILTERS
            </button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={students}
          loading={loading}
          onEdit={openEditModal}
          onDelete={(s) => setDeleteTarget(s)}
          emptyMessage="No students found. Add your first student to get started."
          searchable
          searchPlaceholder="SEARCH STUDENTS..."
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingStudent ? "EDIT STUDENT" : "ADD NEW STUDENT"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase">
              Full Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter student&apos;s full name"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase">
              Class *
            </label>
            <select
              value={form.class_name}
              onChange={(e) => setForm({ ...form, class_name: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase font-semibold text-xs tracking-wider"
            >
              <option value="">CHOOSE A CLASS...</option>
              {classes.map((c) => (
                <option key={c.id || c} value={c.name || c} className="uppercase font-semibold">
                  {(c.name || c).toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase">
              Academic Year *
            </label>
            <select
              value={form.academic_year}
              onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold text-xs tracking-wider"
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase">
              Parent Mobile Number *
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
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. 9876543210"
              maxLength={10}
            />
            {editingStudent && (
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                Note: Updating this will also update their parent portal username/mobile.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
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
              className="px-5 py-2.5 text-xs font-bold tracking-wider uppercase text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {submitting
                ? "SAVING..."
                : editingStudent
                ? "UPDATE STUDENT"
                : "ADD STUDENT"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="DELETE STUDENT"
        message={`Are you sure you want to delete ${deleteTarget?.name?.toUpperCase()}? This will also remove their attendance and marks records.`}
        confirmText="DELETE STUDENT"
        type="danger"
      />
    </>
  );
}
