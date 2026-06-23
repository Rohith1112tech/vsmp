"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/ui/DataTable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function AssignPage() {
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Searchable dropdown state for Teacher Selection
  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    teacher_id: "",
    class_name: "",
  });

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Fetch all necessary data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [assignmentsRes, teachersRes, classesRes] = await Promise.all([
        apiClient.get("/admin/assignments"),
        apiClient.get("/admin/teachers?limit=1000"),
        apiClient.get("/admin/classes"),
      ]);

      // Only show CLASS_TEACHER assignments in this Assign list
      const classTeacherAssignments = (Array.isArray(assignmentsRes) ? assignmentsRes : [])
        .filter((a) => a.role === "CLASS_TEACHER");

      setAssignments(classTeacherAssignments);
      setTeachers(teachersRes?.data || (Array.isArray(teachersRes) ? teachersRes : []));
      setClasses(Array.isArray(classesRes) ? classesRes : []);
    } catch (err) {
      showToast(err.data?.error || "Failed to load page data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open modal and reset form
  function openAddModal() {
    setForm({
      teacher_id: "",
      class_name: "",
    });
    setTeacherSearch("");
    setTeacherDropdownOpen(false);
    setModalOpen(true);
  }

  // Handle Form Submission
  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.teacher_id) {
      showToast("Please select a teacher from the list", "warning");
      return;
    }
    if (!form.class_name) {
      showToast("Please select a class", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        teacher_id: form.teacher_id,
        class_name: form.class_name,
        role: "CLASS_TEACHER",
        subject_id: null,
      };

      await apiClient.post("/admin/assignments", payload);
      showToast("Class teacher assigned successfully", "success");
      setModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.data?.error || "Failed to assign class teacher", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Delete
  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      await apiClient.delete(`/admin/assignments/${deleteTarget.id}`);
      showToast("Assignment removed successfully", "success");
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      showToast(err.data?.error || "Failed to delete assignment", "error");
    }
  }

  // Filter & sort teachers for selection
  const filteredTeachersForSelect = (() => {
    const query = teacherSearch.trim().toLowerCase();
    
    // If showAll is true (query is empty or exactly matches the selected teacher's full label), show all teachers
    const selectedTeacher = teachers.find(t => String(t.id) === form.teacher_id);
    const showAll = !query || (selectedTeacher && teacherSearch === `${selectedTeacher.name.toUpperCase()} (${selectedTeacher.empId})`);
    
    if (showAll) {
      return [...teachers].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    const matches = teachers.filter((t) =>
      t.name.toLowerCase().includes(query) ||
      t.empId.toLowerCase().includes(query)
    );
    
    return matches.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      
      const aStarts = aName.startsWith(query);
      const bStarts = bName.startsWith(query);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return a.name.localeCompare(b.name);
    });
  })();

  // Flatten nested objects to make the list flat and searchable inside DataTable
  const flattenedAssignments = assignments.map((a) => ({
    id: a.id,
    teacherName: (a.teacher?.name || "—").toUpperCase(),
    teacherEmpId: a.teacher?.empId || "—",
    className: a.className || "—",
  }));

  // Define Columns for DataTable
  const columns = [
    {
      key: "teacherName",
      label: "CLASS TEACHER",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold flex-shrink-0 uppercase">
            {(row.teacherName || "?").charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-900 leading-tight uppercase tracking-wide">{row.teacherName}</p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{row.teacherEmpId}</p>
          </div>
        </div>
      ),
    },
    {
      key: "className",
      label: "ASSIGNED CLASS",
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
          🏫 CLASS {row.className?.toUpperCase()}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-1 tracking-wider uppercase bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-transparent">CLASS TEACHER</h1>
            <p className="text-slate-500 text-sm">Assign teachers as Class Teachers for school divisions</p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-wider rounded-xl shadow-sm hover:shadow transition-all duration-200 uppercase"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            ASSIGN CLASS TEACHER
          </button>
        </div>

        {/* DataTable */}
        <DataTable
          columns={columns}
          data={flattenedAssignments}
          loading={loading}
          onDelete={(row) => setDeleteTarget(row)}
          emptyMessage="No class teacher assignments found. Assign your first class teacher to get started."
          searchable
          searchPlaceholder="SEARCH BY TEACHER NAME, ID, OR CLASS..."
        />
      </div>

      {/* Add Assignment Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="ASSIGN CLASS TEACHER">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Searchable Teacher Selection Dropdown */}
          <div className="relative">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase">Select Teacher *</label>
            <div className="relative">
              <input
                type="text"
                value={teacherSearch}
                onFocus={() => setTeacherDropdownOpen(true)}
                onClick={() => setTeacherDropdownOpen(true)}
                onBlur={() => {
                  // Delay closing the dropdown to allow clicks outside options to blur,
                  // but options themselves are clicked via onMouseDown which prevents default blur
                  setTeacherDropdownOpen(false);
                }}
                onChange={(e) => {
                  setTeacherSearch(e.target.value);
                  setForm(prev => ({ ...prev, teacher_id: "" })); // Reset selected ID when search is edited
                }}
                placeholder="Type to search teacher (e.g. John)..."
                className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400">
                {form.teacher_id && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setForm(prev => ({ ...prev, teacher_id: "" }));
                      setTeacherSearch("");
                    }}
                    className="p-0.5 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    title="Clear selection"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${teacherDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {teacherDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {filteredTeachersForSelect.length > 0 ? (
                  filteredTeachersForSelect.map((t) => {
                    const isSelected = form.teacher_id === String(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevents input from losing focus
                          setForm(prev => ({ ...prev, teacher_id: String(t.id) }));
                          setTeacherSearch(`${t.name.toUpperCase()} (${t.empId})`);
                          setTeacherDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex justify-between items-center ${
                          isSelected ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-slate-800 uppercase">{t.name?.toUpperCase()}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{t.empId}</p>
                        </div>
                        {isSelected && (
                          <svg className="w-4.5 h-4.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <p className="p-3.5 text-sm text-slate-400 text-center">No matching teachers found</p>
                )}
              </div>
            )}
          </div>

          {/* Class Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase">Select Class *</label>
            <select
              value={form.class_name}
              onChange={(e) => setForm({ ...form, class_name: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase font-semibold text-xs tracking-wider"
              required
            >
              <option value="">CHOOSE A CLASS...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name?.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 text-xs font-bold tracking-wider uppercase text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-xs font-bold tracking-wider uppercase text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50"
            >
              {submitting ? "ASSIGNING..." : "ASSIGN CLASS TEACHER"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="REMOVE ASSIGNMENT"
        message={`Are you sure you want to remove the assignment for ${deleteTarget?.teacherName?.toUpperCase()} in CLASS ${deleteTarget?.className?.toUpperCase()}?`}
        confirmLabel="REMOVE ASSIGNMENT"
        cancelLabel="CANCEL"
        type="danger"
      />
    </>
  );
}
