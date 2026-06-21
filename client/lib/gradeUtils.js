/**
 * Calculates the grade letter based on the score and max score.
 * Grade boundaries (percentage-based):
 * - 91 - 100 = A1
 * - 81 - 90  = A2
 * - 71 - 80  = B1
 * - 61 - 70  = B2
 * - 51 - 60  = C1
 * - 41 - 50  = C2
 * - 33 - 40  = D
 * - 32 & below = E
 *
 * @param {number} score - The score obtained.
 * @param {number} maxScore - The maximum possible score (default: 100).
 * @returns {string} The grade letter.
 */
export function getGradeLetter(score, maxScore = 100) {
  if (!maxScore || maxScore <= 0) return "E";
  const percentage = (score / maxScore) * 100;
  
  // To handle floating point precision nicely, we can round to nearest integer or just use boundaries.
  // The user says: (91-100=A1), (81-90=A2), (71-80=B1), (61-70=B2), (51-60=C1), (41-50=C2), (33-40=D), (32&below=E)
  if (percentage >= 91) return "A1";
  if (percentage >= 81) return "A2";
  if (percentage >= 71) return "B1";
  if (percentage >= 61) return "B2";
  if (percentage >= 51) return "C1";
  if (percentage >= 41) return "C2";
  if (percentage >= 33) return "D";
  return "E";
}

/**
 * Returns a color palette configuration based on the grade letter.
 * Useful for consistent styling across the application.
 *
 * @param {string} grade - The grade letter (e.g. "A1", "B2").
 * @returns {object} Tailwind classes for bg, text, border, and progress bar.
 */
export function getGradeColor(grade) {
  switch (grade) {
    case "A1":
    case "A2":
      return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", bar: "bg-emerald-500" };
    case "B1":
    case "B2":
      return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", bar: "bg-blue-500" };
    case "C1":
    case "C2":
      return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", bar: "bg-amber-500" };
    case "D":
      return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", bar: "bg-orange-500" };
    case "E":
    default:
      return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", bar: "bg-red-500" };
  }
}
