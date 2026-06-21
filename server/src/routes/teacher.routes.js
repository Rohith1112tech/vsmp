// ============================================================
// Teacher Routes — /api/teacher
// ============================================================
// All routes in this file are protected by requireAuth +
// requireRole('TEACHER') middleware applied at mount level in
// src/index.js.
//
// The JWT payload for authenticated teachers contains:
//   { id: userId, role: 'TEACHER', auth_identifier: empId }
// So req.user.id = User.id, req.user.auth_identifier = Teacher.empId
//
// SECURITY: Every endpoint first resolves the Teacher profile
// from req.user.auth_identifier (emp_id) and verifies that the
// teacher is assigned to the requested class/subject before
// returning or modifying any data.
// ============================================================

import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const router = Router();
const prisma = new PrismaClient();

// ─── Roman numeral class sorting ───────────────────────────
const ROMAN_MAP = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
function romanToInt(str) {
  let total = 0;
  for (let i = 0; i < str.length; i++) {
    const curr = ROMAN_MAP[str[i]] || 0;
    const next = ROMAN_MAP[str[i + 1]] || 0;
    total += curr < next ? -curr : curr;
  }
  return total;
}
function compareClassNames(a, b) {
  const partsA = a.split("-");
  const partsB = b.split("-");
  const numA = romanToInt(partsA[0]);
  const numB = romanToInt(partsB[0]);
  if (numA !== numB) return numA - numB;
  const suffA = partsA.slice(1).join("-");
  const suffB = partsB.slice(1).join("-");
  return suffA.localeCompare(suffB);
}

// ─── Helper Functions ───────────────────────────────────────

/**
 * Finds a Teacher record by their employee ID, eagerly loading
 * all of their class/subject assignments with subject details.
 *
 * @param {string} empId - The teacher's employee identifier
 * @returns {Promise<object|null>} Teacher with assignments or null
 */
async function getTeacherByEmpId(empId) {
  return prisma.teacher.findFirst({
    where: { empId },
    include: {
      assignments: {
        include: { subject: true },
      },
    },
  });
}

/**
 * Checks whether a teacher has a valid assignment for a given
 * class (and optionally a specific subject). Used as a guard
 * before any data access or mutation on class/subject data.
 *
 * @param {number}      teacherId  - Teacher's primary key
 * @param {string}      className  - The class name to verify
 * @param {number|null} subjectId  - Optional subject ID to also verify
 * @returns {Promise<boolean>} true if assignment exists
 */
async function verifyTeacherAssignment(teacherId, className, subjectId = null) {
  const where = { teacherId, className };
  if (subjectId !== null && subjectId !== undefined) {
    where.subjectId = subjectId;
  }
  const assignment = await prisma.teacherAssignment.findFirst({ where });
  return !!assignment;
}

async function verifyIsClassTeacher(teacherId, className) {
  const assignment = await prisma.teacherAssignment.findFirst({
    where: {
      teacherId,
      className,
      role: "CLASS_TEACHER",
    },
  });
  return !!assignment;
}

// ─── 1. GET /dashboard ──────────────────────────────────────

/**
 * GET /api/teacher/dashboard
 *
 * Fetches the authenticated teacher's profile and all of their
 * class-subject assignments. This is the landing page data.
 *
 * Response: {
 *   teacher: { id, name, empId },
 *   assignments: [{ id, className, subject: { id, name } }]
 * }
 */
router.get("/dashboard", async (req, res) => {
  const teacher = await getTeacherByEmpId(req.user.auth_identifier);

  if (!teacher) {
    return res.status(404).json({ error: "Teacher profile not found" });
  }

  res.json({
    teacher: {
      id: teacher.id,
      name: teacher.name,
      empId: teacher.empId,
    },
    assignments: teacher.assignments.map((a) => ({
      id: a.id,
      className: a.className,
      role: a.role,
      subject: a.subject
        ? {
            id: a.subject.id,
            name: a.subject.name,
          }
        : null,
    })),
  });
});

// ─── 2. GET /my-classes ─────────────────────────────────────

/**
 * GET /api/teacher/my-classes
 *
 * Returns the distinct class names the teacher is assigned to.
 * Useful for populating class selector dropdowns in the UI.
 *
 * Response: { classes: ["10-A", "10-B", ...] }
 */
router.get("/my-classes", async (req, res) => {
  const teacher = await getTeacherByEmpId(req.user.auth_identifier);

  if (!teacher) {
    return res.status(404).json({ error: "Teacher profile not found" });
  }

  const { role } = req.query;

  const filteredAssignments = role
    ? teacher.assignments.filter((a) => a.role === role)
    : teacher.assignments;

  // Extract unique class names from assignments
  const classSet = new Set(filteredAssignments.map((a) => a.className));
  const classes = [...classSet].sort(compareClassNames);

  res.json({ classes });
});

// ─── 3. GET /my-subjects ────────────────────────────────────

/**
 * GET /api/teacher/my-subjects
 *
 * Returns the distinct subjects the teacher is assigned to,
 * deduplicated by subject ID (a teacher may teach the same
 * subject in multiple classes).
 *
 * Response: { subjects: [{ id, name }, ...] }
 */
router.get("/my-subjects", async (req, res) => {
  const teacher = await getTeacherByEmpId(req.user.auth_identifier);

  if (!teacher) {
    return res.status(404).json({ error: "Teacher profile not found" });
  }

  // Deduplicate subjects by ID using a Map
  const subjectMap = new Map();
  for (const a of teacher.assignments) {
    if (!subjectMap.has(a.subject.id)) {
      subjectMap.set(a.subject.id, {
        id: a.subject.id,
        name: a.subject.name,
      });
    }
  }

  const subjects = [...subjectMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  res.json({ subjects });
});

// ─── 4. GET /students ───────────────────────────────────────

/**
 * GET /api/teacher/students?class_name=10-A
 *
 * Fetches all students enrolled in a specific class. The teacher
 * must be assigned to the requested class; otherwise a 403 is
 * returned.
 *
 * Query params:
 *   - class_name (required): The class to list students for
 *
 * Response: { students: [{ id, name, className, parentMobile }] }
 */
router.get("/students", async (req, res) => {
  const { class_name } = req.query;

  if (!class_name) {
    return res.status(400).json({ error: "class_name query parameter is required" });
  }

  const teacher = await getTeacherByEmpId(req.user.auth_identifier);

  if (!teacher) {
    return res.status(404).json({ error: "Teacher profile not found" });
  }

  // Authorization: teacher must be assigned to this class
  const isAssigned = await verifyTeacherAssignment(teacher.id, class_name);
  if (!isAssigned) {
    return res.status(403).json({ error: "You are not assigned to this class" });
  }

  const students = await prisma.student.findMany({
    where: { className: class_name },
    include: {
      parent: {
        select: {
          id: true,
          auth_identifier: true,
          role: true,
          resetCode: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  res.json({ students });
});

// ─── 5. GET /attendance ─────────────────────────────────────

/**
 * GET /api/teacher/attendance?class_name=10-A&date=2026-06-10
 *
 * Fetches attendance records for all students in a class on a
 * specific date. Students without an attendance record for that
 * date will have `attendance: null` (unmarked).
 *
 * Query params:
 *   - class_name (required): The class to fetch attendance for
 *   - date (required): Date in YYYY-MM-DD format
 *
 * Response: {
 *   students: [{ id, name, attendance: { id, status } | null }],
 *   date, className
 * }
 */
router.get("/attendance", async (req, res) => {
  const { class_name, date } = req.query;

  if (!class_name || !date) {
    return res
      .status(400)
      .json({ error: "class_name and date query parameters are required" });
  }

  const teacher = await getTeacherByEmpId(req.user.auth_identifier);

  if (!teacher) {
    return res.status(404).json({ error: "Teacher profile not found" });
  }

  // Authorization: teacher must be the designated Class Teacher of this class
  const isClassTeacher = await verifyIsClassTeacher(teacher.id, class_name);
  if (!isClassTeacher) {
    return res.status(403).json({ error: "Only the designated Class Teacher can manage attendance for this class" });
  }

  // Parse the date string into a UTC Date object (midnight)
  const attendanceDate = new Date(date + "T00:00:00.000Z");

  if (isNaN(attendanceDate.getTime())) {
    return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
  }

  // Fetch students with their attendance for the specific date
  const students = await prisma.student.findMany({
    where: { className: class_name },
    select: {
      id: true,
      name: true,
      attendance: {
        where: { date: attendanceDate },
        select: { id: true, status: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Flatten: if attendance array is empty → null, else take first entry
  const result = students.map((s) => ({
    id: s.id,
    name: s.name,
    attendance: s.attendance.length > 0 ? s.attendance[0] : null,
  }));

  res.json({
    students: result,
    date,
    className: class_name,
  });
});

// ─── 6. POST /attendance ────────────────────────────────────

/**
 * POST /api/teacher/attendance
 *
 * Marks or updates attendance for multiple students in a class
 * on a given date. Uses upsert to handle both create and update
 * scenarios, wrapped in a transaction for atomicity.
 *
 * Body: {
 *   class_name: "10-A",
 *   date: "2026-06-10",
 *   records: [
 *     { student_id: 1, status: "PRESENT" },
 *     { student_id: 2, status: "ABSENT" }
 *   ]
 * }
 *
 * Response: { message: "Attendance saved", count: N }
 */
router.post("/attendance", async (req, res) => {
  const { class_name, date, records } = req.body;

  // ── Input validation ────────────────────────────────────
  if (!class_name || !date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({
      error: "class_name, date, and a non-empty records array are required",
    });
  }

  const attendanceDate = new Date(date + "T00:00:00.000Z");
  if (isNaN(attendanceDate.getTime())) {
    return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
  }

  // Validate status values
  const validStatuses = ["PRESENT", "ABSENT"];
  for (const record of records) {
    if (!record.student_id || !record.status) {
      return res.status(400).json({
        error: "Each record must have student_id and status",
      });
    }
    if (!validStatuses.includes(record.status)) {
      return res.status(400).json({
        error: `Invalid status "${record.status}". Must be PRESENT or ABSENT`,
      });
    }
  }

  const teacher = await getTeacherByEmpId(req.user.auth_identifier);

  if (!teacher) {
    return res.status(404).json({ error: "Teacher profile not found" });
  }

  // Authorization: teacher must be the designated Class Teacher of this class
  const isClassTeacher = await verifyIsClassTeacher(teacher.id, class_name);
  if (!isClassTeacher) {
    return res.status(403).json({ error: "Only the designated Class Teacher can manage attendance for this class" });
  }

  // Validate that all student_ids belong to the given class
  const studentIds = records.map((r) => r.student_id);
  const validStudents = await prisma.student.findMany({
    where: {
      id: { in: studentIds },
      className: class_name,
    },
    select: { id: true },
  });

  const validStudentIds = new Set(validStudents.map((s) => s.id));
  const invalidIds = studentIds.filter((id) => !validStudentIds.has(id));

  if (invalidIds.length > 0) {
    return res.status(400).json({
      error: `Students with IDs [${invalidIds.join(", ")}] do not belong to class ${class_name}`,
    });
  }

  // ── Upsert attendance in a transaction ──────────────────
  const upserts = records.map((record) =>
    prisma.attendance.upsert({
      where: {
        studentId_date: {
          studentId: record.student_id,
          date: attendanceDate,
        },
      },
      update: { status: record.status },
      create: {
        studentId: record.student_id,
        date: attendanceDate,
        status: record.status,
      },
    })
  );

  await prisma.$transaction(upserts);

  res.json({ message: "Attendance saved", count: records.length });
});

// ─── 7. GET /marks ──────────────────────────────────────────

/**
 * GET /api/teacher/marks?class_name=10-A&subject_id=1&exam_name=Term+1
 *
 * Fetches marks for all students in a class for a specific
 * subject and exam. Students without a mark record will have
 * `mark: null`.
 *
 * Query params:
 *   - class_name  (required): The class
 *   - subject_id  (required): The subject ID
 *   - exam_name   (required): The exam name
 *
 * Response: {
 *   students: [{ id, name, mark: { id, score, examName } | null }],
 *   className, subject, examName
 * }
 */
router.get("/marks", async (req, res) => {
  const { class_name, subject_id, exam_name } = req.query;

  if (!class_name || !subject_id || !exam_name) {
    return res.status(400).json({
      error: "class_name, subject_id, and exam_name query parameters are required",
    });
  }

  const subjectIdInt = parseInt(subject_id, 10);
  if (isNaN(subjectIdInt)) {
    return res.status(400).json({ error: "subject_id must be a valid integer" });
  }

  const teacher = await getTeacherByEmpId(req.user.auth_identifier);

  if (!teacher) {
    return res.status(404).json({ error: "Teacher profile not found" });
  }

  // Authorization: teacher must be assigned to this class + subject
  const isAssigned = await verifyTeacherAssignment(
    teacher.id,
    class_name,
    subjectIdInt
  );
  if (!isAssigned) {
    return res.status(403).json({
      error: "You are not assigned to this class and subject combination",
    });
  }

  // Look up the subject for the response payload
  const subject = await prisma.subject.findUnique({
    where: { id: subjectIdInt },
    select: { id: true, name: true },
  });

  if (!subject) {
    return res.status(404).json({ error: "Subject not found" });
  }

  // Fetch students with their marks for this subject + exam
  const students = await prisma.student.findMany({
    where: { className: class_name },
    select: {
      id: true,
      name: true,
      marks: {
        where: {
          subjectId: subjectIdInt,
          examName: exam_name,
        },
        select: { id: true, score: true, examName: true, maxScore: true, internalScore: true, theoryScore: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // Flatten: marks array → single mark or null
  const result = students.map((s) => ({
    id: s.id,
    name: s.name,
    mark: s.marks.length > 0 ? s.marks[0] : null,
  }));

  res.json({
    students: result,
    className: class_name,
    subject,
    examName: exam_name,
  });
});

// ─── 8. POST /marks ─────────────────────────────────────────

/**
 * POST /api/teacher/marks
 *
 * Uploads or updates marks for multiple students in a class
 * for a given subject and exam. Uses upsert with a transaction.
 *
 * Body: {
 *   class_name: "10-A",
 *   subject_id: 1,
 *   exam_name: "Term 1",
 *   total_mark: 100, // Optional; defaults to 100
 *   marks: [
 *     { student_id: 1, score: 85.5 },
 *     { student_id: 2, score: 72 }
 *   ]
 * }
 *
 * Response: { message: "Marks saved", count: N }
 */
router.post("/marks", async (req, res) => {
  const { class_name, subject_id, exam_name, marks, total_mark } = req.body;

  // ── Input validation ────────────────────────────────────
  if (!class_name || subject_id === undefined || !exam_name || !Array.isArray(marks) || marks.length === 0) {
    return res.status(400).json({
      error: "class_name, subject_id, exam_name, and a non-empty marks array are required",
    });
  }

  if (typeof exam_name !== "string" || exam_name.trim() === "") {
    return res.status(400).json({ error: "exam_name must be a non-empty string" });
  }

  const subjectIdInt = parseInt(subject_id, 10);
  if (isNaN(subjectIdInt)) {
    return res.status(400).json({ error: "subject_id must be a valid integer" });
  }

  const examNameTrimmed = exam_name.trim();
  const isHYOrAnnual = ["half yearly", "half-yearly", "half early", "half-early", "annual", "anual"].includes(examNameTrimmed.toLowerCase());

  const maxScoreVal = total_mark !== undefined ? parseFloat(total_mark) : 100;
  if (isNaN(maxScoreVal) || maxScoreVal <= 0) {
    return res.status(400).json({ error: "total_mark must be a positive number" });
  }

  // Validate individual mark entries
  for (const entry of marks) {
    if (!entry.student_id) {
      return res.status(400).json({ error: "Each mark entry must have a student_id" });
    }
    if (isHYOrAnnual) {
      if (entry.internalScore !== undefined && entry.internalScore !== null && entry.internalScore !== "") {
        const val = parseFloat(entry.internalScore);
        if (isNaN(val) || val < 0 || val > 20) {
          return res.status(400).json({
            error: `Invalid internal score for student_id ${entry.student_id}. Must be a number between 0 and 20.`,
          });
        }
      }
      if (entry.theoryScore !== undefined && entry.theoryScore !== null && entry.theoryScore !== "") {
        const val = parseFloat(entry.theoryScore);
        if (isNaN(val) || val < 0 || val > 80) {
          return res.status(400).json({
            error: `Invalid theory score for student_id ${entry.student_id}. Must be a number between 0 and 80.`,
          });
        }
      }
    } else {
      if (typeof entry.score !== "number" || isNaN(entry.score)) {
        return res.status(400).json({
          error: `Invalid score for student_id ${entry.student_id}. Score must be a number`,
        });
      }
      if (entry.score < 0 || entry.score > maxScoreVal) {
        return res.status(400).json({
          error: `Score ${entry.score} for student_id ${entry.student_id} is out of range. Must be between 0 and ${maxScoreVal}`,
        });
      }
    }
  }

  const teacher = await getTeacherByEmpId(req.user.auth_identifier);

  if (!teacher) {
    return res.status(404).json({ error: "Teacher profile not found" });
  }

  // Authorization: teacher must be assigned to this class + subject
  const isAssigned = await verifyTeacherAssignment(
    teacher.id,
    class_name,
    subjectIdInt
  );
  if (!isAssigned) {
    return res.status(403).json({
      error: "You are not assigned to this class and subject combination",
    });
  }

  // Validate that all student_ids belong to the given class
  const studentIds = marks.map((m) => m.student_id);
  const validStudents = await prisma.student.findMany({
    where: {
      id: { in: studentIds },
      className: class_name,
    },
    select: { id: true },
  });

  const validStudentIds = new Set(validStudents.map((s) => s.id));
  const invalidIds = studentIds.filter((id) => !validStudentIds.has(id));

  if (invalidIds.length > 0) {
    return res.status(400).json({
      error: `Students with IDs [${invalidIds.join(", ")}] do not belong to class ${class_name}`,
    });
  }

  // ── Upsert marks in a transaction ───────────────────────
  const upserts = marks.map((entry) => {
    let finalScore = 0;
    let finalMaxScore = maxScoreVal;
    let internalScoreVal = null;
    let theoryScoreVal = null;

    if (isHYOrAnnual) {
      internalScoreVal = entry.internalScore !== undefined && entry.internalScore !== null && entry.internalScore !== "" ? parseFloat(entry.internalScore) : null;
      theoryScoreVal = entry.theoryScore !== undefined && entry.theoryScore !== null && entry.theoryScore !== "" ? parseFloat(entry.theoryScore) : null;
      finalScore = (internalScoreVal || 0) + (theoryScoreVal || 0);
      finalMaxScore = 100;
    } else {
      finalScore = entry.score;
    }

    return prisma.mark.upsert({
      where: {
        studentId_subjectId_examName: {
          studentId: entry.student_id,
          subjectId: subjectIdInt,
          examName: examNameTrimmed,
        },
      },
      update: {
        score: finalScore,
        maxScore: finalMaxScore,
        internalScore: internalScoreVal,
        theoryScore: theoryScoreVal,
        teacherId: teacher.id, // Update teacher in case of re-assignment
      },
      create: {
        studentId: entry.student_id,
        subjectId: subjectIdInt,
        teacherId: teacher.id,
        score: finalScore,
        maxScore: finalMaxScore,
        examName: examNameTrimmed,
        internalScore: internalScoreVal,
        theoryScore: theoryScoreVal,
      },
    });
  });

  await prisma.$transaction(upserts);

  res.json({ message: "Marks saved", count: marks.length });
});

// ─── 9. GET /exams ──────────────────────────────────────────

/**
 * GET /api/teacher/exams?subject_id=1&class_name=10-A
 *
 * Returns the distinct exam names for a given subject within a
 * class. This lets the teacher see which exams already have
 * marks recorded.
 *
 * Query params:
 *   - subject_id  (required): The subject ID
 *   - class_name  (required): The class name
 *
 * Response: { exams: ["Term 1", "Mid-term", ...] }
 */
router.get("/exams", async (req, res) => {
  const { subject_id, class_name } = req.query;

  if (!subject_id || !class_name) {
    return res.status(400).json({
      error: "subject_id and class_name query parameters are required",
    });
  }

  const subjectIdInt = parseInt(subject_id, 10);
  if (isNaN(subjectIdInt)) {
    return res.status(400).json({ error: "subject_id must be a valid integer" });
  }

  const teacher = await getTeacherByEmpId(req.user.auth_identifier);

  if (!teacher) {
    return res.status(404).json({ error: "Teacher profile not found" });
  }

  // Authorization: teacher must be assigned to this class + subject
  const isAssigned = await verifyTeacherAssignment(
    teacher.id,
    class_name,
    subjectIdInt
  );
  if (!isAssigned) {
    return res.status(403).json({
      error: "You are not assigned to this class and subject combination",
    });
  }

  // Find all students in the class, then query distinct exam names
  // from marks for those students and this subject
  const studentsInClass = await prisma.student.findMany({
    where: { className: class_name },
    select: { id: true },
  });

  const studentIds = studentsInClass.map((s) => s.id);

  // Use groupBy to get distinct examName values
  const examGroups = await prisma.mark.groupBy({
    by: ["examName"],
    where: {
      subjectId: subjectIdInt,
      studentId: { in: studentIds },
    },
    orderBy: { examName: "asc" },
  });

  const exams = examGroups.map((g) => g.examName);

  res.json({ exams });
});

// ─── 10. POST /change-password ────────────────────────────────

/**
 * POST /api/teacher/change-password
 *
 * Changes the authenticated teacher's password and sets mustChangePassword to false.
 */
router.post("/change-password", async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: "New password is required." });
    }

    const userId = req.user.id;
    const empId = req.user.auth_identifier;

    // Find the teacher profile to verify
    const teacher = await prisma.teacher.findFirst({
      where: { userId, empId },
    });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found." });
    }

    // Hash the new password
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Update password hash and mustChangePassword
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { password_hash },
      }),
      prisma.teacher.update({
        where: { id: teacher.id },
        data: { mustChangePassword: false },
      }),
    ]);

    res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Failed to update password." });
  }
});

/**
 * GET /api/teacher/announcements
 * Fetch all announcements targeted to TEACHER or BOTH.
 */
router.get("/announcements", async (_req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: {
        target: { in: ["TEACHER", "BOTH"] },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(announcements);
  } catch (error) {
    console.error("Teacher fetch announcements error:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

/**
 * POST /api/teacher/announcements
 * Create an announcement targeted to PARENT.
 * Body: { title, content }
 */
router.post("/announcements", async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "title and content are required" });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        target: "PARENT",
      },
    });

    res.status(201).json(announcement);
  } catch (error) {
    console.error("Teacher create announcement error:", error);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

/**
 * GET /api/teacher/homework
 * Fetch all homework records posted by this teacher.
 */
router.get("/homework", async (req, res) => {
  try {
    const teacher = await getTeacherByEmpId(req.user.auth_identifier);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found" });
    }

    const homeworks = await prisma.homework.findMany({
      where: { teacherId: teacher.id },
      include: {
        subject: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(homeworks);
  } catch (error) {
    console.error("Fetch teacher homework error:", error);
    res.status(500).json({ error: "Failed to fetch homework" });
  }
});

/**
 * POST /api/teacher/homework
 * Create a new homework record.
 * Body: { className, subjectId, title, description, dueDate }
 */
router.post("/homework", async (req, res) => {
  try {
    const { className, subjectId, title, description, dueDate } = req.body;

    if (!className || !subjectId || !title || !description || !dueDate) {
      return res.status(400).json({ error: "className, subjectId, title, description, and dueDate are required" });
    }

    const teacher = await getTeacherByEmpId(req.user.auth_identifier);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found" });
    }

    const subjectIdInt = parseInt(subjectId, 10);
    if (isNaN(subjectIdInt)) {
      return res.status(400).json({ error: "subjectId must be a valid integer" });
    }

    // Verify teacher assignment for that class & subject
    const isAssigned = await verifyTeacherAssignment(teacher.id, className, subjectIdInt);
    if (!isAssigned) {
      return res.status(403).json({ error: "You are not assigned to this class and subject combination" });
    }

    const homework = await prisma.homework.create({
      data: {
        className,
        subjectId: subjectIdInt,
        teacherId: teacher.id,
        title,
        description,
        dueDate: new Date(dueDate),
      },
    });

    res.status(201).json(homework);
  } catch (error) {
    console.error("Create homework error:", error);
    res.status(500).json({ error: "Failed to create homework" });
  }
});

/**
 * PUT /api/teacher/homework/:id
 * Edit an existing homework record.
 * Body: { className, subjectId, title, description, dueDate }
 */
router.put("/homework/:id", async (req, res) => {
  try {
    const homeworkId = parseInt(req.params.id, 10);
    if (isNaN(homeworkId)) {
      return res.status(400).json({ error: "Invalid homework ID" });
    }

    const { className, subjectId, title, description, dueDate } = req.body;
    if (!className || !subjectId || !title || !description || !dueDate) {
      return res.status(400).json({ error: "className, subjectId, title, description, and dueDate are required" });
    }

    const teacher = await getTeacherByEmpId(req.user.auth_identifier);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found" });
    }

    // Verify homework exists and belongs to teacher
    const existingHw = await prisma.homework.findUnique({
      where: { id: homeworkId }
    });

    if (!existingHw) {
      return res.status(404).json({ error: "Homework record not found" });
    }

    if (existingHw.teacherId !== teacher.id) {
      return res.status(403).json({ error: "You can only edit your own homework records" });
    }

    const subjectIdInt = parseInt(subjectId, 10);
    if (isNaN(subjectIdInt)) {
      return res.status(400).json({ error: "subjectId must be a valid integer" });
    }

    // Verify assignment for that class & subject
    const isAssigned = await verifyTeacherAssignment(teacher.id, className, subjectIdInt);
    if (!isAssigned) {
      return res.status(403).json({ error: "You are not assigned to this class and subject combination" });
    }

    const updatedHw = await prisma.homework.update({
      where: { id: homeworkId },
      data: {
        className,
        subjectId: subjectIdInt,
        title,
        description,
        dueDate: new Date(dueDate),
      },
    });

    res.json(updatedHw);
  } catch (error) {
    console.error("Update homework error:", error);
    res.status(500).json({ error: "Failed to update homework" });
  }
});

/**
 * DELETE /api/teacher/homework/:id
 * Delete a homework record.
 */
router.delete("/homework/:id", async (req, res) => {
  try {
    const homeworkId = parseInt(req.params.id, 10);
    if (isNaN(homeworkId)) {
      return res.status(400).json({ error: "Invalid homework ID" });
    }

    const teacher = await getTeacherByEmpId(req.user.auth_identifier);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found" });
    }

    // Verify homework exists and belongs to teacher
    const existingHw = await prisma.homework.findUnique({
      where: { id: homeworkId }
    });

    if (!existingHw) {
      return res.status(404).json({ error: "Homework record not found" });
    }

    if (existingHw.teacherId !== teacher.id) {
      return res.status(403).json({ error: "You can only delete your own homework records" });
    }

    await prisma.homework.delete({
      where: { id: homeworkId }
    });

    res.json({ message: "Homework record deleted successfully" });
  } catch (error) {
    console.error("Delete homework error:", error);
    res.status(500).json({ error: "Failed to delete homework" });
  }
});

function generateResetCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function getOrCreateParentUser(parent_mobile) {
  let parentUser = await prisma.user.findUnique({
    where: { auth_identifier: parent_mobile },
  });

  if (!parentUser) {
    const defaultPassword = "parent" + parent_mobile.slice(-4);
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    let resetCode = generateResetCode();
    let exists = await prisma.user.findFirst({ where: { resetCode } });
    while (exists) {
      resetCode = generateResetCode();
      exists = await prisma.user.findFirst({ where: { resetCode } });
    }

    parentUser = await prisma.user.create({
      data: {
        role: "PARENT",
        auth_identifier: parent_mobile,
        password_hash: passwordHash,
        mustChangePassword: true,
        resetCode,
      },
    });
  }
  return parentUser;
}

/**
 * POST /api/teacher/students
 * Adds a new student to a class. Only the designated Class Teacher
 * of that class is authorized to perform this operation.
 */
router.post("/students", async (req, res) => {
  try {
    const { name, class_name, parent_mobile } = req.body;

    if (!name || !class_name || !parent_mobile) {
      return res
        .status(400)
        .json({ error: "name, class_name, and parent_mobile are required" });
    }

    const teacher = await getTeacherByEmpId(req.user.auth_identifier);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found" });
    }

    // Verify if the teacher is the designated Class Teacher of the requested class
    const isClassTeacher = await verifyIsClassTeacher(teacher.id, class_name);
    if (!isClassTeacher) {
      return res.status(403).json({
        error: "Only the designated Class Teacher can add students to this class",
      });
    }

    // Ensure a PARENT user exists for this mobile number
    const parentUser = await getOrCreateParentUser(parent_mobile);
    if (parentUser.role !== "PARENT") {
      return res.status(409).json({
        error: `The identifier "${parent_mobile}" belongs to a ${parentUser.role} user, not a PARENT`,
      });
    }

    const student = await prisma.student.create({
      data: {
        name,
        className: class_name,
        parentMobile: parent_mobile,
      },
      include: {
        parent: {
          select: {
            id: true,
            auth_identifier: true,
            role: true,
            resetCode: true,
          },
        },
      },
    });

    res.status(201).json({
      message: "Student added successfully",
      student,
    });
  } catch (error) {
    console.error("Add student by teacher error:", error);
    res.status(500).json({ error: "Failed to add student" });
  }
});

/**
 * GET /api/teacher/progress-card
 *
 * Fetches progress card marks for a student. Only accessible by the Class Teacher of that class.
 * Works only for Half Yearly and Annual exams.
 *
 * Query params:
 *   - student_id  (required): ID of the student
 *   - exam_name   (required): Exam name (must be Half Yearly / Annual)
 */
router.get("/progress-card", async (req, res) => {
  try {
    const { student_id, exam_name } = req.query;

    if (!student_id || !exam_name) {
      return res.status(400).json({ error: "student_id and exam_name query parameters are required" });
    }

    const studentIdInt = parseInt(student_id, 10);
    if (isNaN(studentIdInt)) {
      return res.status(400).json({ error: "student_id must be a valid integer" });
    }

    const examNameTrimmed = exam_name.trim();
    const isHYOrAnnual = ["half yearly", "half-yearly", "half early", "half-early", "annual", "anual"].includes(examNameTrimmed.toLowerCase());

    if (!isHYOrAnnual) {
      return res.status(400).json({ error: "Progress cards are only available for Half Yearly and Annual exams" });
    }

    const teacher = await getTeacherByEmpId(req.user.auth_identifier);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found" });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentIdInt },
      select: { id: true, name: true, className: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Verify if the teacher is the designated Class Teacher of the student's class
    const isClassTeacher = await verifyIsClassTeacher(teacher.id, student.className);
    if (!isClassTeacher) {
      return res.status(403).json({
        error: "Access denied. Only the designated Class Teacher of this class can view progress cards.",
      });
    }

    // Get all subjects taught in this class
    const assignments = await prisma.teacherAssignment.findMany({
      where: { className: student.className },
      include: { subject: true },
    });

    const subjectMap = {};
    assignments.forEach((a) => {
      if (a.subject) {
        subjectMap[a.subject.id] = a.subject;
      }
    });
    const subjects = Object.values(subjectMap);

    // Fetch all marks for this student and filter by exam name (case-insensitively) in JS
    const studentMarks = await prisma.mark.findMany({
      where: { studentId: studentIdInt },
    });

    const marksFiltered = studentMarks.filter(
      (m) => m.examName.trim().toLowerCase() === examNameTrimmed.toLowerCase()
    );

    const marks = subjects.map((subj) => {
      const mark = marksFiltered.find((m) => m.subjectId === subj.id);
      return {
        subjectId: subj.id,
        subjectName: subj.name,
        internalScore: mark ? mark.internalScore : null,
        theoryScore: mark ? mark.theoryScore : null,
        score: mark ? mark.score : null,
        maxScore: mark ? mark.maxScore : 100,
      };
    });

    res.json({
      student,
      examName: examNameTrimmed,
      marks,
    });
  } catch (error) {
    console.error("Get progress card error:", error);
    res.status(500).json({ error: "Failed to load progress card" });
  }
});

export default router;
