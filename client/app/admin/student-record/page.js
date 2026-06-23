"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import { getGradeLetter, getGradeColor } from "@/lib/gradeUtils";

export default function StudentRecordPage() {
  const { showToast } = useToast();
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState("students"); // "students" | "subjects" | "grades"
  
  // Data lists
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  
  // Selections
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  
  const [performanceData, setPerformanceData] = useState({ classAverage: null, students: [] });
  const [loading, setLoading] = useState(false);

  // Student specific details modal states
  const [viewingStudentId, setViewingStudentId] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState("marks"); // "marks" | "attendance"

  // Unified Initial Data Fetching
  const fetchInitialData = useCallback(async () => {
    try {
      const [clsRes, subRes, assignRes] = await Promise.all([
        apiClient.get("/admin/classes"),
        apiClient.get("/admin/subjects"),
        apiClient.get("/admin/assignments"),
      ]);
      setClasses(clsRes || []);
      setSubjects(subRes || []);
      setAssignments(assignRes || []);
    } catch (err) {
      console.error("Failed to load initial records data:", err);
    }
  }, []);

  const fetchClassPerformance = useCallback(async (className, acadYear) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/admin/classes/${encodeURIComponent(className)}/performance?academic_year=${acadYear}`);
      setPerformanceData(res || { classAverage: null, students: [] });
    } catch (err) {
      showToast(err.data?.error || "Failed to load class performance record", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchStudentDetails = useCallback(async (id, acadYear) => {
    try {
      setLoadingDetails(true);
      const res = await apiClient.get(`/admin/students/${id}?academic_year=${acadYear}`);
      setStudentDetails(res);
    } catch (err) {
      showToast(err.data?.error || "Failed to load student details", "error");
    } finally {
      setLoadingDetails(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (selectedClass) {
      fetchClassPerformance(selectedClass, academicYear);
    } else {
      setPerformanceData({ classAverage: null, students: [] });
    }
  }, [selectedClass, academicYear, fetchClassPerformance]);

  useEffect(() => {
    if (viewingStudentId) {
      fetchStudentDetails(viewingStudentId, academicYear);
    } else {
      setStudentDetails(null);
    }
  }, [viewingStudentId, academicYear, fetchStudentDetails]);

  const columns = [
    {
      key: "name",
      label: "STUDENT NAME",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold uppercase">
            {(row.name || '?').charAt(0).toUpperCase()}
          </div>
          <button
            onClick={() => {
              setViewingStudentId(row.id);
              setActiveDetailsTab("marks");
            }}
            className="font-semibold text-slate-800 hover:text-blue-600 hover:underline text-left focus:outline-none transition-all uppercase tracking-wide"
          >
            {row.name?.toUpperCase() || '—'}
          </button>
        </div>
      ),
    },
    {
      key: "parentMobile",
      label: "PARENT CONTACT",
      render: (row) => (
        <span className="text-slate-500 font-mono text-xs">{row.parentMobile || "—"}</span>
      ),
    },
    {
      key: "avgMark",
      label: "AVERAGE SCORE",
      render: (row) => (
        <span className={`font-semibold text-sm ${
          row.avgMark === null
            ? "text-slate-400"
            : row.avgMark >= 75
            ? "text-emerald-600"
            : row.avgMark >= 40
            ? "text-slate-700"
            : "text-red-500"
        }`}>
          {row.avgMark !== null ? `${row.avgMark}` : "No marks"}
        </span>
      ),
    },
    {
      key: "attendancePercent",
      label: "ATTENDANCE RATE",
      render: (row) => (
        <span className={`font-semibold text-sm ${
          row.attendancePercent === null
            ? "text-slate-400"
            : row.attendancePercent >= 75
            ? "text-emerald-600"
            : "text-amber-500"
        }`}>
          {row.attendancePercent !== null ? `${row.attendancePercent}%` : "No logs"}
        </span>
      ),
    },
  ];

  // Calculate student average for detail modal
  const studentAverage = studentDetails?.marks?.length > 0
    ? Math.round((studentDetails.marks.reduce((acc, m) => acc + m.score, 0) / studentDetails.marks.length) * 10) / 10
    : null;

  // Columns for Subject records table
  const subjectColumns = [
    {
      key: "name",
      label: "STUDENT NAME",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {(row.name || '?').charAt(0).toUpperCase()}
          </div>
          <button
            onClick={() => {
              setViewingStudentId(row.id);
              setActiveDetailsTab("marks");
            }}
            className="font-semibold text-slate-800 hover:text-blue-600 hover:underline text-left focus:outline-none transition-all"
          >
            {row.name?.toUpperCase() || '—'}
          </button>
        </div>
      ),
    },
    {
      key: "parentMobile",
      label: "PARENT CONTACT",
      render: (row) => (
        <span className="text-slate-500 font-mono text-xs">{row.parentMobile || "—"}</span>
      ),
    },
    {
      key: "examScores",
      label: "EXAM SCORES",
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {row.marks && row.marks.length > 0 ? (
            row.marks.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200"
              >
                {m.examName?.toUpperCase()}: <strong className="ml-1 text-slate-900">{m.score}/{m.maxScore}</strong><span className="mx-1 text-slate-300">|</span><strong className="text-slate-600 text-[10px]">GRADE: {getGradeLetter(m.score, m.maxScore)}</strong>
              </span>
            ))
          ) : (
            <span className="text-slate-400 text-xs italic">No scores uploaded</span>
          )}
        </div>
      ),
    },
    {
      key: "average",
      label: "AVERAGE SCORE",
      render: (row) => (
        <span className={`font-semibold text-sm ${
          row.average === null
            ? "text-slate-400"
            : row.average >= 75
            ? "text-emerald-600"
            : row.average >= 40
            ? "text-slate-700"
            : "text-red-500"
        }`}>
          {row.average !== null ? `${row.average}` : "—"}
        </span>
      ),
    },
    {
      key: "averageGrade",
      label: "AVERAGE GRADE",
      render: (row) => {
        if (row.average === null) return <span className="text-slate-400 text-xs italic">—</span>;
        const grade = getGradeLetter(row.average, 100);
        const color = getGradeColor(grade);
        return (
          <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg text-xs font-bold ${color.bg} ${color.text} border ${color.border}`}>
            {grade}
          </span>
        );
      },
    },
  ];

  // Subject performance computations
  const subjectMarks = selectedSubject
    ? performanceData.students.flatMap((student) =>
        (student.marks || []).filter((m) => m.subjectId === Number(selectedSubject))
      )
    : [];

  const subjectAverage = subjectMarks.length > 0
    ? Math.round((subjectMarks.reduce((sum, m) => sum + m.score, 0) / subjectMarks.length) * 10) / 10
    : null;

  const assignedTeachers = assignments
    .filter((a) => a.className === selectedClass && a.subject?.id === Number(selectedSubject))
    .map((a) => a.teacher?.name?.toUpperCase())
    .filter(Boolean);
  const handedBy = assignedTeachers.length > 0 ? assignedTeachers.join(", ") : "NOT ASSIGNED";

  const subjectStudentsData = performanceData.students.map((student) => {
    const studentMarks = (student.marks || []).filter((m) => m.subjectId === Number(selectedSubject));
    const average = studentMarks.length > 0
      ? Math.round((studentMarks.reduce((sum, m) => sum + m.score, 0) / studentMarks.length) * 10) / 10
      : null;
    return {
      id: student.id,
      name: student.name,
      parentMobile: student.parentMobile,
      marks: studentMarks,
      average,
    };
  });

  // Grade distribution calculations for Grade Records tab
  const classMarks = activeTab === "grades" && selectedSubject
    ? performanceData.students.flatMap((student) =>
        (student.marks || []).filter((m) => m.subjectId === Number(selectedSubject))
      )
    : performanceData.students.flatMap((student) => student.marks || []);
  const gradeCounts = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, D: 0, E: 0 };
  classMarks.forEach((m) => {
    const grade = getGradeLetter(m.score, m.maxScore);
    if (gradeCounts[grade] !== undefined) {
      gradeCounts[grade]++;
    }
  });
  const totalClassMarks = classMarks.length;

  const gradeDetails = [
    { grade: "A1", range: "91-100", count: gradeCounts.A1, color: getGradeColor("A1") },
    { grade: "A2", range: "81-90", count: gradeCounts.A2, color: getGradeColor("A2") },
    { grade: "B1", range: "71-80", count: gradeCounts.B1, color: getGradeColor("B1") },
    { grade: "B2", range: "61-70", count: gradeCounts.B2, color: getGradeColor("B2") },
    { grade: "C1", range: "51-60", count: gradeCounts.C1, color: getGradeColor("C1") },
    { grade: "C2", range: "41-50", count: gradeCounts.C2, color: getGradeColor("C2") },
    { grade: "D",  range: "33-40", count: gradeCounts.D,  color: getGradeColor("D") },
    { grade: "E",  range: "≤32",   count: gradeCounts.E,  color: getGradeColor("E") },
  ];

  const subjectBreakdown = subjects.map((sub) => {
    const subMarks = classMarks.filter((m) => m.subjectId === sub.id);
    const counts = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, D: 0, E: 0 };
    subMarks.forEach((m) => {
      const grade = getGradeLetter(m.score, m.maxScore);
      if (counts[grade] !== undefined) {
        counts[grade]++;
      }
    });
    const total = subMarks.length;
    return {
      subjectId: sub.id,
      subjectName: sub.name.toUpperCase(),
      ...counts,
      total,
    };
  }).filter((s) => s.total > 0);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-wider uppercase bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-transparent">RECORD</h1>
        <p className="text-slate-500 text-sm mt-1">
          Monitor class averages, subject distributions, and student grade records.
        </p>
      </div>

      {/* Global Academic Year Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">
            ACTIVE ACADEMIC YEAR
          </h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            Saves and filters marks, attendance rates, and progress reports for this year.
          </p>
        </div>
        <select
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-w-[160px]"
        >
          <option value="2025-2026">2025-2026</option>
          <option value="2026-2027">2026-2027</option>
          <option value="2027-2028">2027-2028</option>
        </select>
      </div>

      {/* Tab Selector */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap">
        <button
          type="button"
          onClick={() => setActiveTab("students")}
          className={`py-3 px-5 text-sm font-bold tracking-wider uppercase transition-colors border-b-2 -mb-px flex-shrink-0 ${
            activeTab === "students"
              ? "text-blue-600 border-blue-600"
              : "text-slate-500 border-transparent hover:text-slate-700"
          }`}
        >
          STUDENT RECORDS
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("subjects")}
          className={`py-3 px-5 text-sm font-bold tracking-wider uppercase transition-colors border-b-2 -mb-px flex-shrink-0 ${
            activeTab === "subjects"
              ? "text-blue-600 border-blue-600"
              : "text-slate-500 border-transparent hover:text-slate-700"
          }`}
        >
          SUBJECT RECORDS
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("grades")}
          className={`py-3 px-5 text-sm font-bold tracking-wider uppercase transition-colors border-b-2 -mb-px flex-shrink-0 ${
            activeTab === "grades"
              ? "text-blue-600 border-blue-600"
              : "text-slate-500 border-transparent hover:text-slate-700"
          }`}
        >
          GRADE RECORDS
        </button>
      </div>

      {activeTab === "students" && (
        <>
          {/* Class Selector dropdown and Class Average card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                SELECT CLASS
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">CHOOSE CLASS...</option>
                {classes.map((cls) => {
                  const name = cls.name || cls;
                  return (
                    <option key={name} value={name} className="uppercase">{name.toUpperCase()}</option>
                  );
                })}
              </select>
            </div>

            {/* Class Average card */}
            {selectedClass && (
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between animate-fade-in">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  CLASS AVERAGE
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-3xl font-extrabold tracking-tight ${
                    performanceData.classAverage === null
                      ? "text-slate-400"
                      : performanceData.classAverage >= 75
                      ? "text-emerald-600"
                      : "text-blue-900"
                  }`}>
                    {performanceData.classAverage !== null ? performanceData.classAverage : "—"}
                  </span>
                  {performanceData.classAverage !== null && (
                    <span className="text-xs text-slate-400 font-medium">/ 100 overall score</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  Aggregated exam performance across all subjects.
                </p>
              </div>
            )}
          </div>

          {selectedClass ? (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-6 space-y-4 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                  STUDENTS IN {selectedClass?.toUpperCase()}
                </h2>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
                  {performanceData.students.length} STUDENTS
                </span>
              </div>

              <DataTable
                columns={columns}
                data={performanceData.students}
                loading={loading}
                emptyMessage={`NO STUDENT RECORDS FOUND IN ${selectedClass?.toUpperCase()}.`}
                searchable
                searchPlaceholder="SEARCH CLASS STUDENTS..."
              />
            </div>
          ) : (
            <div className="py-12 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-xl">
                📚
              </div>
              <h3 className="text-sm font-semibold text-slate-800">No Class Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Please choose a class from the dropdown above to view student lists, scores, and class averages.
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === "subjects" && (
        <>
          {/* Subject Records selectors and Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                SELECT CLASS
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">CHOOSE CLASS...</option>
                {classes.map((cls) => {
                  const name = cls.name || cls;
                  return (
                    <option key={name} value={name} className="uppercase">{name.toUpperCase()}</option>
                  );
                })}
              </select>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                SELECT SUBJECT
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">CHOOSE SUBJECT...</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id} className="uppercase">{sub.name.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {selectedClass && selectedSubject && (
              <>
                {/* Subject Average card */}
                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between animate-fade-in">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    SUBJECT AVERAGE
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className={`text-3xl font-extrabold tracking-tight ${
                      subjectAverage === null
                        ? "text-slate-400"
                        : subjectAverage >= 75
                        ? "text-emerald-600"
                        : "text-blue-900"
                    }`}>
                      {subjectAverage !== null ? subjectAverage : "—"}
                    </span>
                    {subjectAverage !== null && (
                      <span className="text-xs text-slate-400 font-medium">/ 100 overall</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    Calculated class average score for this subject.
                  </p>
                </div>

                {/* Handed by card */}
                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between animate-fade-in">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    HANDED BY
                  </span>
                  <div className="mt-2">
                    <span className="text-lg font-bold text-slate-800 leading-tight block truncate" title={handedBy}>
                      👤 {handedBy}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    Teacher assigned to this subject section.
                  </p>
                </div>
              </>
            )}
          </div>

          {selectedClass && selectedSubject ? (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-6 space-y-4 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                  STUDENT GRADES IN {(subjects.find(s => s.id === Number(selectedSubject))?.name)?.toUpperCase()} ({selectedClass?.toUpperCase()})
                </h2>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
                  {subjectStudentsData.length} STUDENTS
                </span>
              </div>

              <DataTable
                columns={subjectColumns}
                data={subjectStudentsData}
                loading={loading}
                emptyMessage={`NO STUDENT GRADES FOUND FOR THIS SUBJECT IN ${selectedClass?.toUpperCase()}.`}
                searchable
                searchPlaceholder="SEARCH CLASS STUDENTS..."
              />
            </div>
          ) : (
            <div className="py-12 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-xl">
                📚
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Select Class & Subject</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Please select both a class and a subject from the selectors above to view subject averages, teachers, and student scores.
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === "grades" && (
        <>
          {/* Grade Records selectors and Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                SELECT CLASS
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">CHOOSE CLASS...</option>
                {classes.map((cls) => {
                  const name = cls.name || cls;
                  return (
                    <option key={name} value={name} className="uppercase">{name.toUpperCase()}</option>
                  );
                })}
              </select>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                SELECT SUBJECT
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">ALL SUBJECTS</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id} className="uppercase">{sub.name.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {selectedClass && (
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between animate-fade-in">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Graded Scores
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-blue-900">
                    {totalClassMarks}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">recorded marks</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  Total number of subject grades computed for this class.
                </p>
              </div>
            )}

            {selectedClass && selectedSubject && (
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between animate-fade-in">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Handed By
                </span>
                <div className="mt-2">
                  <span className="text-lg font-bold text-slate-800 leading-tight block truncate" title={handedBy}>
                    👤 {handedBy}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  Teacher assigned to this subject.
                </p>
              </div>
            )}
          </div>

          {selectedClass ? (
            <div className="space-y-6 animate-fade-in-up">
              {/* Grade Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                {gradeDetails.map((detail) => {
                  const colors = detail.color || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
                  const percentage = totalClassMarks > 0
                    ? Math.round((detail.count / totalClassMarks) * 100)
                    : 0;
                  return (
                    <div
                      key={detail.grade}
                      className={`p-4 rounded-2xl border ${colors.bg} ${colors.border} flex flex-col justify-between shadow-sm`}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className={`text-xl font-black ${colors.text}`}>{detail.grade}</span>
                          <span className="text-[10px] text-slate-400 font-medium font-mono">{detail.range}</span>
                        </div>
                        <div className="mt-4 text-2xl font-extrabold text-slate-800">{detail.count}</div>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200/50 pt-2">
                        <span className="text-[10px] text-slate-400 font-semibold">Distribution</span>
                        <span className="text-[10px] text-slate-500 font-bold">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress Bars Visual Summary */}
              {totalClassMarks > 0 && (
                <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">Grade Distribution Bar</h3>
                  <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden flex">
                    {gradeDetails.map((detail) => {
                      const percentage = totalClassMarks > 0 ? (detail.count / totalClassMarks) * 100 : 0;
                      if (percentage === 0) return null;
                      const colors = detail.color || { bar: "bg-slate-500" };
                      return (
                        <div
                          key={detail.grade}
                          style={{ width: `${percentage}%` }}
                          className={`${colors.bar} h-full transition-all duration-500 flex items-center justify-center`}
                          title={`${detail.grade}: ${detail.count} (${Math.round(percentage)}%)`}
                        >
                          {percentage >= 5 && (
                            <span className="text-[10px] font-bold text-white leading-none">
                              {detail.grade}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend / Info */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-[10px] text-slate-500 font-medium">
                    {gradeDetails.map((detail) => (
                      <div key={detail.grade} className="flex items-center gap-1">
                        <span className={`w-2.5 h-2.5 rounded ${detail.color?.bar || "bg-slate-500"}`} />
                        <span>{detail.grade} ({detail.count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subject-wise Grade Distribution Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    Subject-wise Grade Distribution
                  </h2>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {subjectBreakdown.length} active subjects
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600 border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="py-3 px-4 font-bold text-slate-700">Subject</th>
                        <th className="py-3 px-4 font-bold text-center text-emerald-700">A1</th>
                        <th className="py-3 px-4 font-bold text-center text-emerald-600">A2</th>
                        <th className="py-3 px-4 font-bold text-center text-blue-700">B1</th>
                        <th className="py-3 px-4 font-bold text-center text-blue-600">B2</th>
                        <th className="py-3 px-4 font-bold text-center text-amber-700">C1</th>
                        <th className="py-3 px-4 font-bold text-center text-amber-600">C2</th>
                        <th className="py-3 px-4 font-bold text-center text-orange-600">D</th>
                        <th className="py-3 px-4 font-bold text-center text-red-600">E</th>
                        <th className="py-3 px-4 font-bold text-center text-slate-700 bg-slate-100/50">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {subjectBreakdown.length > 0 ? (
                        subjectBreakdown.map((row) => (
                          <tr key={row.subjectId} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-slate-800">{row.subjectName}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{row.A1 || "—"}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-emerald-500">{row.A2 || "—"}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-blue-600">{row.B1 || "—"}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-blue-500">{row.B2 || "—"}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-amber-600">{row.C1 || "—"}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-amber-500">{row.C2 || "—"}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-orange-500">{row.D || "—"}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-red-500">{row.E || "—"}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-700 bg-slate-100/30">{row.total}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="10" className="py-8 text-center text-slate-400 italic">
                            No subject grades recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">No Class Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Please choose a class from the dropdown above to view overall grade statistics and subject-wise grade distributions.
              </p>
            </div>
          )}
        </>
      )}

      {/* Student Details modal comparing to Class Average */}
      <Modal
        isOpen={!!viewingStudentId}
        onClose={() => setViewingStudentId(null)}
        title={studentDetails ? `${studentDetails.name?.toUpperCase()}'S PROGRESS RECORD` : "LOADING RECORDS..."}
      >
        {loadingDetails ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Retrieving details...</p>
          </div>
        ) : studentDetails ? (
          <div className="space-y-6">
            {/* Profile Card with stats compared to Class Average */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/60">
              <div className="text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Student Avg</p>
                <p className={`text-base font-extrabold mt-1 ${
                  studentAverage === null
                    ? "text-slate-400"
                    : studentAverage >= (performanceData.classAverage || 0)
                    ? "text-emerald-600"
                    : "text-amber-600"
                }`}>
                  {studentAverage !== null ? studentAverage : "—"}
                </p>
                {studentAverage !== null && performanceData.classAverage !== null && (
                  <p className="text-[9px] text-slate-400 mt-0.5 font-medium">
                    {studentAverage >= performanceData.classAverage
                      ? `+${Math.round((studentAverage - performanceData.classAverage)*10)/10} vs Class`
                      : `${Math.round((studentAverage - performanceData.classAverage)*10)/10} vs Class`}
                  </p>
                )}
              </div>
              <div className="text-center border-x border-slate-200">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Class Avg</p>
                <p className="text-base font-extrabold text-blue-900 mt-1">
                  {performanceData.classAverage !== null ? performanceData.classAverage : "—"}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Reference Target</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Attendance %</p>
                <p className={`text-base font-extrabold mt-1 ${
                  (studentDetails.attendanceSummary?.present / (studentDetails.attendanceSummary?.total || 1)) * 100 >= 75
                    ? "text-emerald-600"
                    : "text-amber-600"
                }`}>
                  {studentDetails.attendanceSummary?.total > 0
                    ? `${Math.round((studentDetails.attendanceSummary.present / studentDetails.attendanceSummary.total) * 100)}%`
                    : "0%"}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5 font-medium">
                  {studentDetails.attendanceSummary?.present} / {studentDetails.attendanceSummary?.total} days
                </p>
              </div>
            </div>

            {/* Tab selector */}
            <div className="flex border-b border-slate-100">
              <button
                type="button"
                onClick={() => setActiveDetailsTab("marks")}
                className={`py-2 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                  activeDetailsTab === "marks"
                    ? "text-blue-600 border-blue-600"
                    : "text-slate-400 border-transparent hover:text-slate-600"
                }`}
              >
                📝 Detailed Marks
              </button>
              <button
                type="button"
                onClick={() => setActiveDetailsTab("attendance")}
                className={`py-2 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                  activeDetailsTab === "attendance"
                    ? "text-blue-600 border-blue-600"
                    : "text-slate-400 border-transparent hover:text-slate-600"
                }`}
              >
                ✅ Attendance Log
              </button>
            </div>

            {/* Marks Tab content */}
            {activeDetailsTab === "marks" && (
              <div className="space-y-4">
                {studentDetails.marks?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="py-2.5 px-3 font-semibold text-slate-500 uppercase tracking-wider">SUBJECT</th>
                          <th className="py-2.5 px-3 font-semibold text-slate-500 uppercase tracking-wider">EXAM</th>
                          <th className="py-2.5 px-3 font-semibold text-slate-500 uppercase tracking-wider text-right">SCORE</th>
                          <th className="py-2.5 px-3 font-semibold text-slate-500 uppercase tracking-wider text-center">GRADE</th>
                          <th className="py-2.5 px-3 font-semibold text-slate-500 uppercase tracking-wider">GRADED BY</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentDetails.marks.map((mark) => (
                          <tr key={mark.id} className="hover:bg-slate-50/30">
                            <td className="py-2.5 px-3 font-bold uppercase tracking-wider text-slate-800">{(mark.subject?.name || '—').toUpperCase()}</td>
                            <td className="py-2.5 px-3 font-bold uppercase tracking-wider text-slate-700">{(mark.examName || '—').toUpperCase()}</td>
                            <td className={`py-2.5 px-3 text-right font-bold ${
                              mark.score >= 40 ? "text-slate-800" : "text-red-500"
                            }`}>
                              {mark.score} / {mark.maxScore || 100}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {(() => {
                                const grade = getGradeLetter(mark.score, mark.maxScore || 100);
                                const color = getGradeColor(grade);
                                return (
                                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold ${color.bg} ${color.text} border ${color.border}`}>
                                    {grade}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="py-2.5 px-3 font-bold uppercase tracking-wider text-slate-500">{(mark.teacher?.name || 'FACULTY').toUpperCase()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No exam marks uploaded for this student yet.
                  </div>
                )}
              </div>
            )}

            {/* Attendance Tab content */}
            {activeDetailsTab === "attendance" && (
              <div className="space-y-4">
                {studentDetails.attendance?.length > 0 ? (
                  <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-600 border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 sticky top-0">
                          <th className="py-2 px-3 font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">DATE</th>
                          <th className="py-2 px-3 font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 text-right">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentDetails.attendance.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-50/30">
                            <td className="py-2 px-3">{new Date(att.date).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                att.status === "PRESENT"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : "bg-red-100 text-red-800 border border-red-200"
                              }`}>
                                {att.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No attendance records logged for this student yet.
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingStudentId(null)}
                className="px-5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-red-500">
            Failed to retrieve student record.
          </div>
        )}
      </Modal>
    </div>
  );
}
