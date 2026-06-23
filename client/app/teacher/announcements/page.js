"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";

export default function TeacherAnnouncementsPage() {
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
  });

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/teacher/announcements");
      setAnnouncements(res || []);
    } catch (err) {
      showToast(err.data?.error || "Failed to load announcements", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  function openAddModal() {
    setForm({ title: "", content: "" });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast("Title is required", "warning");
      return;
    }
    if (!form.content.trim()) {
      showToast("Message content is required", "warning");
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post("/teacher/announcements", {
        title: form.title.trim(),
        content: form.content.trim(),
      });
      showToast("Announcement posted to parents successfully", "success");
      setModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      showToast(err.data?.error || "Failed to post announcement", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      key: "title",
      label: "TITLE",
      render: (row) => (
        <div className="font-semibold text-slate-900">{row.title}</div>
      ),
    },
    {
      key: "content",
      label: "MESSAGE",
      render: (row) => (
        <div className="max-w-md truncate text-slate-600" title={row.content}>
          {row.content}
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "DATE RECEIVED",
      render: (row) => (
        <span className="text-slate-500 text-xs">
          {new Date(row.createdAt).toLocaleDateString(undefined, {
            dateStyle: "medium",
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold text-slate-900 mb-1 tracking-wider uppercase bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-transparent">
            ANNOUNCEMENTS
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            VIEW ANNOUNCEMENTS SENT TO YOU, AND POST NOTICES DIRECTLY TO PARENTS.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-200 shadow-sm shadow-blue-500/20 hover:shadow-blue-500/30"
        >
          ANNOUNCE TO PARENTS
        </button>
      </div>

      {/* Received Announcements Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">INCOMING NOTICES</h2>
        <DataTable
          columns={columns}
          data={announcements}
          loading={loading}
          emptyMessage="NO ANNOUNCEMENTS FOUND."
        />
      </div>

      {/* Post to Parents Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="ANNOUNCE TO PARENTS">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-[10px] font-bold uppercase tracking-wider">
            THIS ANNOUNCEMENT WILL BE VISIBLE ONLY TO PARENTS OF ALL STUDENTS.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              TITLE *
            </label>
            <input
              type="text"
              required
              placeholder="E.G. SPECIAL HOLIDAY ANNOUNCEMENT, SCHOOL DRESS CODE"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              MESSAGE CONTENT *
            </label>
            <textarea
              required
              rows={5}
              placeholder="WRITE THE MESSAGE DETAILS HERE..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
              {submitting ? "POSTING..." : "POST ANNOUNCEMENT"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
