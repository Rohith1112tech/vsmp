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
      label: "Title",
      render: (row) => (
        <div className="font-semibold text-slate-900">{row.title}</div>
      ),
    },
    {
      key: "content",
      label: "Message",
      render: (row) => (
        <div className="max-w-md truncate text-slate-600" title={row.content}>
          {row.content}
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Date Received",
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
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <span>📢</span> Announcements
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            View announcements sent to you, and post notices directly to parents.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm shadow-blue-500/20 hover:shadow-blue-500/30"
        >
          <span>➕</span> Announce to Parents
        </button>
      </div>

      {/* Received Announcements Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900">Incoming Notices</h2>
        <DataTable
          columns={columns}
          data={announcements}
          loading={loading}
          emptyMessage="No announcements found."
        />
      </div>

      {/* Post to Parents Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Announce to Parents">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs">
            ℹ️ This announcement will be visible <strong>only to parents</strong> of all students.
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Special Holiday Announcement, School Dress Code"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Message Content *
            </label>
            <textarea
              required
              rows={5}
              placeholder="Write the message details here..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-200 shadow-sm disabled:opacity-50"
            >
              {submitting ? "Posting..." : "Post Announcement"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
