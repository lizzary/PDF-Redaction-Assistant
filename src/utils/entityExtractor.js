// Entity extraction utilities — compromise.js for NER name recognition + regex for dates

import nlp from 'compromise';

/**
 * Month names (full + abbreviated)
 */
const MONTH_NAMES = '(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';

/**
 * Date regex pattern collection
 */
const DATE_PATTERNS = [
  // DD/MM/YYYY 或 DD-MM-YYYY
  { regex: /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\b/g, type: 'date' },
  // Month DD, YYYY  e.g. January 12, 2024
  { regex: new RegExp(`\\b${MONTH_NAMES}\\s+\\d{1,2},?\\s+\\d{4}\\b`, 'gi'), type: 'date' },
  // DD Month YYYY  e.g. 12 January 2024
  { regex: new RegExp(`\\b\\d{1,2}\\s+${MONTH_NAMES}\\s+\\d{4}\\b`, 'gi'), type: 'date' },
  // YYYY-MM-DD (ISO format)
  { regex: /\b\d{4}-\d{2}-\d{2}\b/g, type: 'date' },
];

/**
 * Fallback regex: initials + surname pattern that compromise may miss.
 * E.g.: J.P. Morgan, A.B. Smith, J.R.R. Tolkien
 */
const INITIALS_NAME_PATTERN = /\b(?:[A-Z]\.\s*)+(?:[A-Z][a-zà-ÿ]+(?:['’-][A-Z][a-zà-ÿ]*)*)\b/g;

/**
 * Extract all date entities from text
 */
function extractDates(text, pageNum) {
  const results = [];
  const seen = new Set();

  for (const { regex, type } of DATE_PATTERNS) {
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
      const key = `${match[0].toLowerCase()}:${match.index}:${pageNum}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          type,
          text: match[0],
          pageNum,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  return results;
}

/**
 * Extract person names from text using compromise.js (primary method).
 * compromise uses context to judge, automatically filtering out Title Case non-names (e.g., Chapter, Section).
 */
function extractNamesWithCompromise(text, pageNum) {
  const results = [];
  const seen = new Set();

  try {
    const offsets = nlp(text).people().out('offset');

    for (const entry of offsets) {
      const { text: nameText, offset } = entry;
      if (!offset || !nameText || nameText.trim().length === 0) continue;

      // Filter out single-word results (compromise occasionally returns partial single-word names)
      const wordCount = nameText.trim().split(/\s+/).length;
      if (wordCount < 2) continue;

      const startIndex = offset.start;
      const endIndex = offset.start + nameText.length;
      const key = `${nameText.toLowerCase()}:${startIndex}:${pageNum}`;

      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          type: 'name',
          text: nameText,
          pageNum,
          startIndex,
          endIndex,
        });
      }
    }
  } catch (err) {
    // Silently degrade when compromise parsing fails
    console.warn('compromise name extraction failed:', err);
  }

  return { results, seen };
}

/**
 * Extract initials-style names using regex (supplements compromise, catches what it missed).
 * E.g., J.P. Morgan, A.B. Smith
 */
function extractInitialsNames(text, pageNum) {
  const results = [];

  let match;
  while ((match = INITIALS_NAME_PATTERN.exec(text)) !== null) {
    results.push({
      type: 'name',
      text: match[0],
      pageNum,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return results;
}

/**
 * Merge and deduplicate two sets of name results
 */
function mergeNameResults(primary, secondary) {
  const all = [...primary];

  for (const item of secondary) {
    // Check for overlap with existing results (same position or containment)
    const isDuplicate = all.some(existing =>
      existing.pageNum === item.pageNum &&
      (existing.startIndex === item.startIndex ||
       (item.startIndex >= existing.startIndex && item.startIndex < existing.endIndex) ||
       (existing.startIndex >= item.startIndex && existing.startIndex < item.endIndex))
    );

    if (!isDuplicate) {
      all.push(item);
    }
  }

  return all;
}

/**
 * Extract all person names from text
 */
function extractNames(text, pageNum) {
  const { results: compromiseResults } = extractNamesWithCompromise(text, pageNum);
  const initialsResults = extractInitialsNames(text, pageNum);
  return mergeNameResults(compromiseResults, initialsResults);
}

/**
 * Extract all entities from a single page's text (dates + names)
 */
export function extractEntities(text, pageNum) {
  const dates = extractDates(text, pageNum);
  const names = extractNames(text, pageNum);
  return [...dates, ...names];
}

/**
 * Batch extract entities from an array of page texts
 */
export function extractAllEntities(pageTexts) {
  const allEntities = [];
  for (const { text, pageNum } of pageTexts) {
    allEntities.push(...extractEntities(text, pageNum));
  }
  return allEntities;
}
