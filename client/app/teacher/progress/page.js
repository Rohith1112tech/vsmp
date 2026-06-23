"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { getGradeLetter, getGradeColor } from "@/lib/gradeUtils";

export default function ProgressCardPage() {
  const { showToast } = useToast();

  // Load state and dropdown lists
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Selected values
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedExam, setSelectedExam] = useState("");

  // Result data
  const [progressCard, setProgressCard] = useState(null);

  // Fetch teacher assignments to verify Class Teacher assignment on mount
  useEffect(() => {
    async function load() {
      try {
        setLoadingInit(true);
        const res = await apiClient.get("/teacher/dashboard");
        setAssignments(res.assignments || []);
      } catch (err) {
        showToast(err.data?.error || "Failed to load class assignment data", "error");
      } finally {
        setLoadingInit(false);
      }
    }
    load();
  }, [showToast]);

  // Extract classes where this teacher is assigned as a CLASS_TEACHER
  const classTeacherClasses = assignments
    .filter((a) => a.role === "CLASS_TEACHER")
    .map((a) => a.className)
    .filter((v, i, self) => self.indexOf(v) === i);

  const isClassTeacher = classTeacherClasses.length > 0;

  // Load students when class changes
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setSelectedStudent("");
      setProgressCard(null);
      return;
    }
    async function loadStudents() {
      setLoadingStudents(true);
      try {
        const res = await apiClient.get(`/teacher/students?class_name=${encodeURIComponent(selectedClass)}`);
        setStudents(res.students || []);
      } catch (err) {
        showToast(err.data?.error || "Failed to load students", "error");
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    }
    loadStudents();
  }, [selectedClass, showToast]);

  // Load progress card marks when student and exam are selected
  useEffect(() => {
    if (!selectedStudent || !selectedExam) {
      setProgressCard(null);
      return;
    }
    async function fetchProgressCard() {
      setLoadingProgress(true);
      try {
        const res = await apiClient.get(
          `/teacher/progress-card?student_id=${selectedStudent}&exam_name=${encodeURIComponent(selectedExam)}`
        );
        setProgressCard(res);
      } catch (err) {
        showToast(err.data?.error || "Failed to load progress card", "error");
        setProgressCard(null);
      } finally {
        setLoadingProgress(false);
      }
    }
    fetchProgressCard();
  }, [selectedStudent, selectedExam, showToast]);

  // Reset student and exam on class change
  const handleClassChange = (e) => {
    setSelectedClass(e.target.value);
    setSelectedStudent("");
    setSelectedExam("");
  };

  const handleStudentChange = (e) => {
    setSelectedStudent(e.target.value);
    setSelectedExam("");
  };

  // Calculations for summary card
  const marksList = progressCard?.marks || [];
  const totalSubjects = marksList.length;
  
  // Calculate total marks and max marks
  let totalInternal = 0;
  let totalTheory = 0;
  let totalObtained = 0;
  let totalPossible = 0;
  let hasAnyMarks = false;

  marksList.forEach((m) => {
    if (m.internalScore != null || m.theoryScore != null) {
      hasAnyMarks = true;
      totalInternal += m.internalScore || 0;
      totalTheory += m.theoryScore || 0;
      totalObtained += m.score || 0;
      totalPossible += m.maxScore || 100;
    }
  });

  const percentage = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0;
  const overallGrade = hasAnyMarks ? getGradeLetter(totalObtained, totalPossible) : "—";
  const overallGradeColor = hasAnyMarks ? getGradeColor(overallGrade) : null;

  if (loadingInit) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  if (!isClassTeacher) {
    return (
      <div className="p-8 max-w-md mx-auto mt-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
          🔒
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          The Progress Card tool is restricted to designated Class Teachers only. You currently do not have any Class Teacher assignments.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-1">Class Progress Card</h1>
        <p className="text-slate-500">View progress cards for students in your class (Half Yearly & Annual Exams)</p>
      </div>

      {/* Selectors */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Class Select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Class</label>
            <select
              value={selectedClass}
              onChange={handleClassChange}
              className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="">Select Class</option>
              {classTeacherClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls?.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Student Select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Student</label>
            <select
              value={selectedStudent}
              onChange={handleStudentChange}
              disabled={!selectedClass || loadingStudents}
              className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">
                {loadingStudents ? "Loading students..." : "Select Student"}
              </option>
              {students.map((stu) => (
                <option key={stu.id} value={stu.id}>
                  {stu.name?.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Exam</label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              disabled={!selectedStudent}
              className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Select Exam</option>
              <option value="Half Yearly">HALF YEARLY</option>
              <option value="Annual">ANNUAL</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading state for progress card query */}
      {loadingProgress && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Fetching progress card data...</p>
        </div>
      )}

      {/* Empty States */}
      {!loadingProgress && (!selectedClass || !selectedStudent || !selectedExam) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-50 flex items-center justify-center text-3xl">
            📈
          </div>
          <p className="text-slate-500 font-medium">
            {!selectedClass
              ? "Select class to start"
              : !selectedStudent
              ? "Select student"
              : "Select exam to view progress card"}
          </p>
        </div>
      )}

      {/* Progress Card display */}
      {!loadingProgress && progressCard && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Student Profile</div>
              <h2 className="text-xl font-extrabold text-slate-950">{progressCard.student?.name?.toUpperCase()}</h2>
              <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                <span>CLASS: <span className="font-semibold text-slate-700">{progressCard.student?.className?.toUpperCase()}</span></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <span>EXAM: <span className="font-semibold text-slate-700">{progressCard.examName?.toUpperCase()}</span></span>
              </div>
            </div>

            {hasAnyMarks ? (
              <div className="flex flex-wrap gap-4 items-center">
                <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 text-center min-w-[100px]">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Marks</div>
                  <div className="text-base font-extrabold text-slate-950 mt-0.5">
                    {totalObtained} <span className="text-xs text-slate-500">/ {totalPossible}</span>
                  </div>
                </div>

                <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 text-center min-w-[90px]">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Percentage</div>
                  <div className="text-base font-extrabold text-slate-950 mt-0.5">
                    {percentage.toFixed(1)}%
                  </div>
                </div>

                {overallGradeColor && (
                  <div className={`${overallGradeColor.bg} ${overallGradeColor.border} px-4 py-2.5 rounded-xl border text-center min-w-[80px]`}>
                    <div className={`text-[10px] font-bold ${overallGradeColor.text} uppercase tracking-wider`}>Overall Grade</div>
                    <div className={`text-base font-black ${overallGradeColor.text} mt-0.5`}>
                      {overallGrade}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm font-semibold text-amber-600 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-100">
                ⚠️ No marks entered for this exam yet.
              </div>
            )}
          </div>

          {/* Marks Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="font-bold text-slate-900">Marks Statement</h3>
            </div>

            {totalSubjects === 0 ? (
              <div className="py-12 text-center text-slate-500 font-medium">
                No subjects assigned to this class.
              </div>
            ) : (
              <div>
                {/* Table Header */}
                <div className="hidden sm:flex items-center gap-4 px-6 py-3 bg-blue-600 text-white font-bold">
                  <div className="flex-1 text-xs font-bold uppercase tracking-wider text-left">Subject</div>
                  <div className="w-36 text-xs font-bold uppercase tracking-wider text-center">Internal Mark (20)</div>
                  <div className="w-36 text-xs font-bold uppercase tracking-wider text-center">Theory Mark (80)</div>
                  <div className="w-36 text-xs font-bold uppercase tracking-wider text-center">Total Mark (100)</div>
                  <div className="w-24 text-xs font-bold uppercase tracking-wider text-center">Grade</div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-slate-100">
                  {marksList.map((m, idx) => {
                    const hasMark = m.internalScore != null || m.theoryScore != null;
                    const internal = m.internalScore != null ? String(m.internalScore) : "—";
                    const theory = m.theoryScore != null ? String(m.theoryScore) : "—";
                    const total = m.score != null ? String(m.score) : "—";
                    const grade = m.score != null ? getGradeLetter(m.score, 100) : "—";
                    const gradeColor = m.score != null ? getGradeColor(grade) : null;

                    return (
                      <div
                        key={m.subjectId}
                        className={`flex items-center gap-4 px-6 py-3.5 transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                        }`}
                      >
                        {/* Subject Name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{m.subjectName?.toUpperCase()}</p>
                          <p className="text-xs font-semibold text-slate-500 sm:hidden mt-0.5">
                            Int: <span className="font-bold text-slate-800">{internal}</span>/20 | 
                            Thy: <span className="font-bold text-slate-800">{theory}</span>/80 | 
                            Tot: <span className="font-bold text-slate-800">{total}</span>/100
                            {hasMark && (
                              <span className="ml-1.5 text-[10px] font-black text-blue-600 bg-blue-50 px-1 rounded border border-blue-200">
                                Grade: {grade}
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Internal Score */}
                        <div className="w-36 text-center text-sm font-extrabold text-slate-900 hidden sm:block">
                          {internal}
                        </div>

                        {/* Theory Score */}
                        <div className="w-36 text-center text-sm font-extrabold text-slate-900 hidden sm:block">
                          {theory}
                        </div>

                        {/* Total Score */}
                        <div className="w-36 text-center text-sm font-extrabold text-slate-950 hidden sm:block">
                          {total}
                        </div>

                        {/* Grade */}
                        <div className="w-24 flex justify-center flex-shrink-0 hidden sm:flex">
                          {hasMark && gradeColor ? (
                            <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-xs font-black shadow-sm border ${gradeColor.bg} ${gradeColor.text} ${gradeColor.border}`}>
                              {grade}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
