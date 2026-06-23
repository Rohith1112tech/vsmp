"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { useSearchParams } from "next/navigation";
import { getGradeLetter, getGradeColor } from "@/lib/gradeUtils";

function getScoreColor(score, maxScore = 100) {
  return getGradeColor(getGradeLetter(score, maxScore));
}

function MarksContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const childParam = searchParams.get("child");

  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(childParam || "");
  const [summary, setSummary] = useState(null);
  const [marks, setMarks] = useState(null);
  const [examNames, setExamNames] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");

  // Fetch children list
  useEffect(() => {
    async function fetchChildren() {
      try {
        const res = await apiClient.get("/parent/children");
        setChildren(res.children || []);
        if (childParam && res.children?.some((c) => String(c.id) === String(childParam))) {
          setSelectedChild(String(childParam));
        } else if (res.children?.length > 0 && !selectedChild) {
          setSelectedChild(String(res.children[0].id));
        }
      } catch (err) {
        showToast(err.data?.error || "Failed to load children", "error");
      } finally {
        setLoadingChildren(false);
      }
    }
    fetchChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

  const [academicYear, setAcademicYear] = useState("2026-2027");

  // Fetch summary when child or academicYear changes
  const fetchSummary = useCallback(async () => {
    if (!selectedChild) return;
    setLoadingSummary(true);
    try {
      const res = await apiClient.get(
        `/parent/children/${selectedChild}/marks/summary?academic_year=${academicYear}`
      );
      setSummary(res);
    } catch (err) {
      showToast(err.data?.error || "Failed to load marks summary", "error");
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedChild, academicYear, showToast]);

  // Fetch detailed marks when child, exam filter or academicYear changes
  const fetchMarks = useCallback(async () => {
    if (!selectedChild) return;
    setLoadingMarks(true);
    try {
      const params = new URLSearchParams();
      if (selectedExam) params.append("exam_name", selectedExam);
      if (academicYear) params.append("academic_year", academicYear);
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await apiClient.get(`/parent/children/${selectedChild}/marks${query}`);
      setMarks(res.marks || []);
      setExamNames(res.examNames || []);
    } catch (err) {
      showToast(err.data?.error || "Failed to load marks", "error");
      setMarks(null);
    } finally {
      setLoadingMarks(false);
    }
  }, [selectedChild, selectedExam, academicYear, showToast]);

  useEffect(() => {
    fetchSummary();
    fetchMarks();
  }, [fetchSummary, fetchMarks]);

  const selectedChildData = children.find((c) => String(c.id) === String(selectedChild));

  const filteredSummary = useMemo(() => {
    if (!summary || !summary.subjectSummary) return null;
    if (!selectedExam) return summary;

    const filteredList = summary.subjectSummary
      .map((subj) => {
        const filteredMarks = (subj.marks || []).filter(
          (m) => (m.examName || m.exam_name) === selectedExam
        );

        if (filteredMarks.length === 0) return null;

        const scores = filteredMarks.map((m) => Number(m.score) || 0);
        const sum = scores.reduce((acc, s) => acc + s, 0);
        const average = Math.round((sum / scores.length) * 10) / 10;
        const highest = Math.max(...scores);
        const lowest = Math.min(...scores);

        return {
          ...subj,
          average,
          highest,
          lowest,
          totalExams: filteredMarks.length,
          marks: filteredMarks,
        };
      })
      .filter(Boolean);

    return {
      ...summary,
      subjectSummary: filteredList,
    };
  }, [summary, selectedExam]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-semibold text-slate-900 mb-1 tracking-wider uppercase bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 bg-clip-text text-transparent">ACADEMIC PERFORMANCE</h1>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">REVIEW YOUR CHILD&apos;S EXAM SCORES AND SUBJECT PERFORMANCE.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Child selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">CHILD</label>
            {loadingChildren ? (
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            ) : (
              <select
                value={selectedChild}
                onChange={(e) => {
                  setSelectedChild(e.target.value);
                  setSelectedExam("");
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">SELECT A CHILD</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name?.toUpperCase()} — {child.className?.toUpperCase()}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Academic Year selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">FILTER BY ACADEMIC YEAR</label>
            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                setSelectedExam("");
              }}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
              <option value="2027-2028">2027-2028</option>
            </select>
          </div>

          {/* Exam filter */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">FILTER BY EXAM</label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">ALL EXAMS</option>
              {examNames.map((name) => (
                <option key={name} value={name}>
                  {name?.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!selectedChild ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <span className="text-5xl mb-4 block">👆</span>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a Child</h3>
          <p className="text-slate-500">Choose a child above to view their academic performance.</p>
        </div>
      ) : (
        <>
          {/* Student info */}
          {selectedChildData && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-lg font-bold">
                {(selectedChildData.name?.charAt(0) || "S").toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">{selectedChildData.name?.toUpperCase()}</h3>
                <p className="text-sm text-slate-500">{selectedChildData.className?.toUpperCase()}</p>
              </div>
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex gap-1 mb-6 bg-white rounded-xl border border-slate-200 shadow-sm p-1 w-fit">
            <button
              onClick={() => setActiveTab("summary")}
              className={`px-5 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
                activeTab === "summary"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              SUBJECT SUMMARY
            </button>
            <button
              onClick={() => setActiveTab("detailed")}
              className={`px-5 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
                activeTab === "detailed"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              DETAILED MARKS
            </button>
          </div>

          {/* Subject Summary Tab */}
          {activeTab === "summary" && (
            <>
              {loadingSummary ? (
                <div className="space-y-6">
                  {/* Graph Skeleton */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
                    <div className="h-6 w-48 bg-slate-100 rounded-lg animate-pulse mb-4" />
                    <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-xl animate-pulse" />
                          <div className="flex-1">
                            <div className="h-5 w-24 bg-slate-100 rounded-lg animate-pulse mb-2" />
                            <div className="h-4 w-32 bg-slate-100 rounded-lg animate-pulse" />
                          </div>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : filteredSummary?.subjectSummary?.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                  <span className="text-5xl mb-4 block">📝</span>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Marks Yet</h3>
                  <p className="text-slate-500">No exam scores have been recorded yet.</p>
                </div>
              ) : (
                <>
                  {/* Graphical Summary Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 animate-fade-in">
                    <div className="mb-6 text-center">
                      <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                        PERFORMANCE GRAPH SUMMARY
                      </h2>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-0.5">VISUAL REPRESENTATION OF SUBJECT AVERAGE SCORES</p>
                    </div>

                    {/* SVG Line Chart */}
                    {(() => {
                      const subjects = filteredSummary?.subjectSummary || [];
                      
                      // 1. Gather all unique exam names across all subjects' marks
                      const exams = Array.from(
                        new Set(
                          subjects.flatMap(s => (s.marks || []).map(m => (m.examName || m.exam_name || "").toUpperCase()))
                        )
                      ).filter(Boolean).sort();

                      const W = 500, H = 200, padL = 48, padR = 16, padT = 20, padB = 45;
                      const chartW = W - padL - padR;
                      const chartH = H - padT - padB;
                      const yGridlines = [0, 20, 40, 60, 80, 100];
                      
                      const getX = (i) => {
                        if (exams.length < 2) return padL + chartW / 2;
                        return padL + 20 + (i / (exams.length - 1)) * (chartW - 40);
                      };
                      
                      const getY = (val) => padT + chartH - (Math.min(Math.max(val, 0), 100) / 100) * chartH;
                      
                      // Modern, premium colors for lines
                      const seriesColors = ["#4472c4", "#ed7d31", "#a5a5a5", "#ffc000", "#0d9488", "#8b5cf6", "#ef4444", "#ec4899"];
                      const getColor = (index) => seriesColors[index % seriesColors.length];

                      // 2. Generate points for each subject across the exams
                      const lineSeries = subjects.map((s, sIdx) => {
                        const points = [];
                        exams.forEach((exam, examIdx) => {
                          const mark = (s.marks || []).find(m => (m.examName || m.exam_name || "").toUpperCase() === exam);
                          if (mark !== undefined) {
                            points.push({
                              x: getX(examIdx),
                              y: getY(Number(mark.score) || 0),
                              score: Number(mark.score) || 0
                            });
                          }
                        });
                        return {
                          subjectName: (s.subject?.name || s.subject || "").toUpperCase(),
                          points,
                          color: getColor(sIdx)
                        };
                      });

                      const getPolyline = (pts) => pts.map(p => `${p.x},${p.y}`).join(" ");
                      
                      return (
                        <div className="relative w-full overflow-x-auto">
                          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{maxHeight: 200, minWidth: 260}}>
                            {/* Y-axis gridlines */}
                            {yGridlines.map(val => (
                              <g key={val}>
                                <line x1={padL} x2={W - padR} y1={getY(val)} y2={getY(val)} stroke="#cbd5e1" strokeWidth="0.5" />
                                <text x={padL - 6} y={getY(val) + 3} textAnchor="end" fontSize="7" fill="#94a3b8" fontWeight="600">{val}</text>
                              </g>
                            ))}
                            
                            {/* Y-axis label */}
                            <text x={-(padT + chartH / 2)} y="16" transform="rotate(-90)" textAnchor="middle" fontSize="8" fontWeight="800" fill="#475569" letterSpacing="1">
                              MARKS
                            </text>
                            
                            {/* Lines */}
                            {lineSeries.map((series, sIdx) => (
                              <g key={sIdx}>
                                {series.points.length > 1 ? (
                                  <polyline
                                    points={getPolyline(series.points)}
                                    fill="none"
                                    stroke={series.color}
                                    strokeWidth="3"
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                  />
                                ) : series.points.length === 1 ? (
                                  <circle
                                    cx={series.points[0].x}
                                    cy={series.points[0].y}
                                    r="4"
                                    fill={series.color}
                                  />
                                ) : null}
                              </g>
                            ))}
                            
                            {/* Exam tick labels on X-axis */}
                            {exams.map((exam, i) => (
                              <g key={i}>
                                <text x={getX(i)} y={padT + chartH + 14} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#64748b">
                                  {exam.length > 10 ? exam.slice(0, 10) + "…" : exam}
                                </text>
                              </g>
                            ))}
                            
                            {/* X-axis line */}
                            <line x1={padL} x2={W - padR} y1={padT + chartH} y2={padT + chartH} stroke="#94a3b8" strokeWidth="1" />
                            
                            {/* X-axis label */}
                            <text x={padL + chartW / 2} y={padT + chartH + 32} textAnchor="middle" fontSize="8" fontWeight="800" fill="#475569" letterSpacing="1">
                              EXAMS
                            </text>
                          </svg>
                        </div>
                      );
                    })()}

                    {/* Centered Legend */}
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2.5 text-[10px] font-extrabold text-slate-500 mt-4 border-t border-slate-100 pt-4 uppercase tracking-wider">
                      {(filteredSummary?.subjectSummary || []).map((s, idx) => {
                        const seriesColors = ["#4472c4", "#ed7d31", "#a5a5a5", "#ffc000", "#0d9488", "#8b5cf6", "#ef4444", "#ec4899"];
                        const color = seriesColors[idx % seriesColors.length];
                        const name = (s.subject?.name || s.subject || "").toUpperCase();
                        return (
                          <span key={idx} className="flex items-center gap-2">
                            <span className="w-5 h-[3px] rounded-full" style={{ backgroundColor: color }}></span>
                            {name}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredSummary?.subjectSummary?.map((subj, idx) => {
                      const avg = Number(subj.average) || 0;
                      const colors = getScoreColor(avg);
                      return (
                        <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                          <div className="p-5">
                            {/* Subject header */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center`}>
                                  <span className={`text-lg font-bold ${colors.text}`}>{getGradeLetter(avg)}</span>
                                </div>
                                <div>
                                  <h3 className="text-base font-semibold text-slate-900">{(subj.subject?.name || subj.subject || '—').toUpperCase()}</h3>
                                  <p className="text-xs text-slate-500">{subj.totalExams} exam{subj.totalExams !== 1 ? "s" : ""}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-2xl font-bold ${colors.text}`}>{avg.toFixed(1)}</p>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">AVERAGE</p>
                              </div>
                            </div>

                            {/* Score bar */}
                            <div className="mb-4">
                              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                                  style={{ width: `${Math.min(avg, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Min/Max */}
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                <span className="text-slate-500 uppercase font-bold tracking-wide">LOWEST: <span className="font-bold text-slate-700">{subj.lowest}</span></span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                <span className="text-slate-500 uppercase font-bold tracking-wide">HIGHEST: <span className="font-bold text-slate-700">{subj.highest}</span></span>
                              </div>
                            </div>

                            {/* Individual exam scores */}
                            {subj.marks?.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">EXAM BREAKDOWN</p>
                                <div className="space-y-2">
                                  {subj.marks.map((m, mIdx) => {
                                    const sc = Number(m.score) || 0;
                                    const maxSc = m.maxScore || 100;
                                    const mColors = getScoreColor(sc, maxSc);
                                    return (
                                      <div key={mIdx} className="flex items-center justify-between">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{(m.examName || m.exam_name || '—').toUpperCase()}</span>
                                        <div className="flex items-center gap-2">
                                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${mColors.bg} ${mColors.text} border ${mColors.border}`}>
                                            SCORE: {sc} / {maxSc}
                                          </span>
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getGradeColor(getGradeLetter(sc, maxSc)).bg} ${getGradeColor(getGradeLetter(sc, maxSc)).text} ${getGradeColor(getGradeLetter(sc, maxSc)).border}`}>
                                            GRADE: {getGradeLetter(sc, maxSc)}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* Detailed Marks Tab */}
          {activeTab === "detailed" && (
            <>
              {loadingMarks ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 py-3">
                        <div className="h-5 w-24 bg-slate-100 rounded-lg animate-pulse" />
                        <div className="h-5 w-20 bg-slate-100 rounded-lg animate-pulse" />
                        <div className="h-5 w-16 bg-slate-100 rounded-lg animate-pulse" />
                        <div className="h-5 w-24 bg-slate-100 rounded-lg animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : marks?.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                  <span className="text-5xl mb-4 block">📝</span>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Marks Found</h3>
                  <p className="text-slate-500">
                    {selectedExam
                      ? `No marks recorded for "${selectedExam}".`
                      : "No exam scores have been recorded yet."}
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      {selectedExam ? `MARKS — ${selectedExam.toUpperCase()}` : "ALL EXAM MARKS"}
                    </h3>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {marks?.length} RECORD{marks?.length !== 1 ? "S" : ""}
                    </span>
                  </div>

                  {/* Table for larger screens */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Exam</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Grade</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Teacher</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {marks?.map((mark, idx) => {
                          const sc = Number(mark.score) || 0;
                          const maxSc = mark.maxScore || 100;
                          const colors = getScoreColor(sc, maxSc);
                          const grade = getGradeLetter(sc, maxSc);
                          const gColors = getGradeColor(grade);
                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-900">{(mark.subject?.name || mark.subject || '—').toUpperCase()}</td>
                              <td className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-600">{(mark.examName || mark.exam_name || '—').toUpperCase()}</td>
                              <td className="px-6 py-3.5 text-center">
                                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
                                  {sc} / {maxSc}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-center">
                                <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg text-xs font-bold ${gColors.bg} ${gColors.text} border ${gColors.border}`}>
                                  {grade}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-600">{(mark.teacher?.name || mark.teacher || '—').toUpperCase()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Card view for mobile */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {marks?.map((mark, idx) => {
                      const sc = Number(mark.score) || 0;
                      const maxSc = mark.maxScore || 100;
                      const colors = getScoreColor(sc, maxSc);
                      const grade = getGradeLetter(sc, maxSc);
                      const gColors = getGradeColor(grade);
                      return (
                        <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">{(mark.subject?.name || mark.subject || '—').toUpperCase()}</h4>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
                                SCORE: {sc} / {maxSc}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${gColors.bg} ${gColors.text} border ${gColors.border}`}>
                                GRADE: {grade}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="font-bold uppercase tracking-wider">{(mark.examName || mark.exam_name || '—').toUpperCase()}</span>
                            {mark.teacher && (
                              <>
                                <span>•</span>
                                <span className="uppercase font-bold">{(mark.teacher?.name || mark.teacher || '').toUpperCase()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function MarksPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-56 bg-slate-100 rounded-lg animate-pulse mb-2" />
            <div className="h-5 w-72 bg-slate-100 rounded-lg animate-pulse" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <MarksContent />
    </Suspense>
  );
}
