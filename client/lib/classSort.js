/**
 * Roman numeral-aware class name sorting utility.
 *
 * Class names follow the format "ROMAN-COLOR" (e.g. "VII-BLUE", "X-YELLOW").
 * This comparator sorts by the Roman numeral grade first, then alphabetically
 * by the colour/section suffix.
 */

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

/**
 * Compare two class name strings like "VII-BLUE" and "X-YELLOW".
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareClassNames(a, b) {
  const nameA = typeof a === "string" ? a : a.name || "";
  const nameB = typeof b === "string" ? b : b.name || "";
  const partsA = nameA.split("-");
  const partsB = nameB.split("-");
  const numA = romanToInt(partsA[0]);
  const numB = romanToInt(partsB[0]);
  if (numA !== numB) return numA - numB;
  const suffA = partsA.slice(1).join("-");
  const suffB = partsB.slice(1).join("-");
  return suffA.localeCompare(suffB);
}
