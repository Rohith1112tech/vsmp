"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
import Modal from "@/components/ui/Modal";

export default function TeacherDashboard() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClassesModalOpen, setIsClassesModalOpen] = useState(false);
  const [isSubjectsModalOpen, setIsSubjectsModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [dashboardRes, announcementsRes] = await Promise.all([
          apiClient.get("/teacher/dashboard"),
          apiClient.get("/teacher/announcements"),
        ]);
        setData(dashboardRes);
        setAnnouncements(announcementsRes || []);
      } catch (err) {
        showToast(err.data?.error || "Failed to load dashboard", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  const uniqueClasses = data?.assignments
    ? [...new Set(data.assignments.map((a) => a.className))]
    : [];
  const uniqueSubjects = data?.assignments
    ? [...new Map(data.assignments.filter((a) => a.subject).map((a) => [a.subject.id, a.subject])).values()]
    : [];

  const classDetails = uniqueClasses.map((clsName) => {
    const clsAssignments = data.assignments.filter((a) => a.className === clsName);
    const isClassTeacher = clsAssignments.some((a) => a.role === "CLASS_TEACHER");
    const subjects = clsAssignments
      .filter((a) => a.role === "SUBJECT_TEACHER" && a.subject)
      .map((a) => a.subject.name.toUpperCase());
    return {
      className: clsName,
      isClassTeacher,
      subjects,
    };
  });

  const subjectDetails = uniqueSubjects.map((sub) => {
    const subAssignments = data.assignments.filter((a) => a.subject && a.subject.id === sub.id);
    const classes = [...new Set(subAssignments.map((a) => a.className))];
    return {
      subjectName: sub.name.toUpperCase(),
      classes,
    };
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-semibold text-slate-900 mb-1 tracking-wider uppercase bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-transparent">
          DASHBOARD
        </h1>
        <p className="text-slate-500">
          Welcome{data?.teacher?.name ? `, ${data.teacher.name.toUpperCase()}` : ""}. Here are your assignments.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        {loading ? (
          [...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center text-center">
              <div className="h-3 w-24 bg-slate-100 rounded animate-pulse mb-2.5" />
              <div className="h-9 w-12 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ))
        ) : (
          <>
            <div
              onClick={() => setIsClassesModalOpen(true)}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-300 text-center flex flex-col items-center justify-center cursor-pointer group"
            >
              <p className="text-[10px] font-bold text-slate-400 group-hover:text-slate-500 transition-colors tracking-widest uppercase mb-1">
                ASSIGNED CLASSES
              </p>
              <p className="text-4xl font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                {uniqueClasses.length}
              </p>
            </div>
            <div
              onClick={() => setIsSubjectsModalOpen(true)}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-300 text-center flex flex-col items-center justify-center cursor-pointer group"
            >
              <p className="text-[10px] font-bold text-slate-400 group-hover:text-slate-500 transition-colors tracking-widest uppercase mb-1">
                SUBJECTS TEACHING
              </p>
              <p className="text-4xl font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                {uniqueSubjects.length}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Notice Board */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 tracking-wider uppercase">
          NOTICE BOARD
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <p className="text-slate-500 text-sm py-4 text-center">No announcements at this time.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white hover:border-blue-200 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-slate-900 text-sm sm:text-base">{ann.title}</h3>
                  <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-1 rounded-md font-medium whitespace-nowrap">
                    {new Date(ann.createdAt).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{ann.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <Link href="/teacher/attendance" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-blue-200 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform"><span className="text-3xl">✅</span></div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">Mark Attendance</h3>
              <p className="text-sm text-slate-500">Record daily student attendance for your classes</p>
            </div>
          </div>
        </Link>
        <Link href="/teacher/marks" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-blue-200 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform"><span className="text-3xl">📝</span></div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">Upload Marks</h3>
              <p className="text-sm text-slate-500">Enter and edit student marks for your subjects</p>
            </div>
          </div>
        </Link>
        {data?.assignments?.some((a) => a.role === "CLASS_TEACHER") && (
          <Link href="/teacher/progress" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-blue-200 transition-all group lg:col-span-2">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform"><span className="text-3xl">📈</span></div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">Class Progress Card</h3>
                <p className="text-sm text-slate-500">View progress cards for students in your class (Half Yearly & Annual Exams)</p>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Class Details Modal */}
      <Modal
        isOpen={isClassesModalOpen}
        onClose={() => setIsClassesModalOpen(false)}
        title="ASSIGNED CLASSES"
        size="md"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {classDetails.length === 0 ? (
            <p className="text-slate-500 text-center py-4 text-sm font-semibold">NO ASSIGNED CLASSES</p>
          ) : (
            classDetails.map((item) => (
              <div
                key={item.className}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 text-lg">{item.className?.toUpperCase()}</span>
                  {item.isClassTeacher && (
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                      CLASS TEACHER
                    </span>
                  )}
                </div>
                {item.subjects.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      SUBJECTS TEACHING
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {item.subjects.map((sub) => (
                        <span
                          key={sub}
                          className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Subject Details Modal */}
      <Modal
        isOpen={isSubjectsModalOpen}
        onClose={() => setIsSubjectsModalOpen(false)}
        title="SUBJECTS TEACHING"
        size="md"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {subjectDetails.length === 0 ? (
            <p className="text-slate-500 text-center py-4 text-sm font-semibold">NO SUBJECTS ASSIGNED</p>
          ) : (
            subjectDetails.map((item) => (
              <div
                key={item.subjectName}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-2"
              >
                <span className="font-extrabold text-slate-800 text-lg uppercase">
                  {item.subjectName}
                </span>
                {item.classes.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      CLASSES
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {item.classes.map((cls) => (
                        <span
                          key={cls}
                          className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase"
                        >
                          {cls?.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
