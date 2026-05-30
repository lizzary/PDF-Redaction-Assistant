// PDF utilities — loading, text extraction, coordinate conversion, rendering

import * as pdfjsLib from 'pdfjs-dist';

// Set PDF.js worker — using CDN for CRA/webpack compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

/**
 * Load a PDF file and return the pdfjs document object
 * @param {File|ArrayBuffer} source - PDF file or ArrayBuffer
 * @returns {Promise<pdfjsLib.PDFDocumentProxy>}
 */
export async function loadPdf(source) {
  const pdfDoc = await pdfjsLib.getDocument(source).promise;
  return pdfDoc;
}

/**
 * Extract text items from a page (including position info)
 * @param {pdfjsLib.PDFPageProxy} page
 * @returns {Promise<Array>} textItems array
 */
export async function extractPageTextItems(page) {
  const textContent = await page.getTextContent();
  return textContent.items;
}

/**
 * Get the plain text content of a page (for regex matching)
 * @param {pdfjsLib.PDFPageProxy} page
 * @returns {Promise<string>}
 */
export async function getPageText(page) {
  const items = await extractPageTextItems(page);
  return items.map(item => item.str).join(' ');
}

/**
 * Build a character-index-to-text-item mapping.
 * Inserts a space between items (matching the actual join behavior) for accurate mapping.
 * @param {Array} textItems - pdf.js textContent.items
 * @returns {{ fullText: string, charToItem: Array<number> }}
 */
function buildCharIndexMap(textItems) {
  const segments = [];
  const charToItem = [];

  for (let i = 0; i < textItems.length; i++) {
    const item = textItems[i];

    // Space between every pair of items, matching .join(' ') behavior
    if (i > 0) {
      segments.push(' ');
      charToItem.push(-1);
    }

    const str = item.str;
    segments.push(str);
    for (let j = 0; j < str.length; j++) {
      charToItem.push(i);
    }
  }

  return {
    fullText: segments.join(''),
    charToItem,
  };
}

/**
 * Get the font size of a text item
 * @param {Object} textItem
 * @returns {number}
 */
function getFontHeight(textItem) {
  const tx = textItem.transform;
  return Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
}

/**
 * Find the bounding box for an entity from textItems using its character positions.
 * PDF coordinate origin is bottom-left; CSS origin is top-left — Y axis must be flipped.
 *
 * @param {Array} textItems - page textContent.items
 * @param {number} startIndex - entity start character index in full text
 * @param {number} endIndex - entity end character index in full text
 * @param {number} viewportHeight - viewport height (after scaling)
 * @param {number} scale - render scale factor
 * @returns {{ x: number, y: number, width: number, height: number }|null}
 */
export function findEntityBoundingBox(textItems, startIndex, endIndex, viewportHeight, scale) {
  const { charToItem } = buildCharIndexMap(textItems);

  if (startIndex >= charToItem.length || endIndex > charToItem.length) {
    return null;
  }

  // Find the start position of each text item in the full text
  const itemStartPositions = new Map();
  for (let c = 0; c < charToItem.length; c++) {
    const idx = charToItem[c];
    if (idx >= 0 && !itemStartPositions.has(idx)) {
      itemStartPositions.set(idx, c);
    }
  }

  // Group entity characters by text item, tracking precise char offsets within each item
  const itemRanges = new Map(); // itemIdx -> { charStart, charEnd } (offsets within item.str)

  for (let c = startIndex; c < endIndex; c++) {
    const itemIdx = charToItem[c];
    if (itemIdx < 0) continue; // space between items

    const itemStart = itemStartPositions.get(itemIdx);
    const offsetInItem = c - itemStart;

    const existing = itemRanges.get(itemIdx);
    if (existing) {
      existing.charStart = Math.min(existing.charStart, offsetInItem);
      existing.charEnd = Math.max(existing.charEnd, offsetInItem + 1);
    } else {
      itemRanges.set(itemIdx, { charStart: offsetInItem, charEnd: offsetInItem + 1 });
    }
  }

  if (itemRanges.size === 0) return null;

  // Compute bounding box from precise character positions within each item
  let minXPdf = Infinity, minYPdf = Infinity, maxXPdf = -Infinity, maxYPdf = -Infinity;

  for (const [itemIdx, { charStart, charEnd }] of itemRanges) {
    const item = textItems[itemIdx];
    const tx = item.transform;
    const pdfX = tx[4];
    const pdfY = tx[5];
    const fontHeight = getFontHeight(item);
    const itemWidth = item.width > 0 ? item.width : item.str.length * fontHeight * 0.6;
    const strLen = item.str.length;

    // Interpolate x within the item based on character offset
    const charXStart = pdfX + (charStart / strLen) * itemWidth;
    const charXEnd = pdfX + (charEnd / strLen) * itemWidth;

    minXPdf = Math.min(minXPdf, charXStart);
    minYPdf = Math.min(minYPdf, pdfY);
    maxXPdf = Math.max(maxXPdf, charXEnd);
    maxYPdf = Math.max(maxYPdf, pdfY + fontHeight);
  }

  // Convert to CSS coordinate system (origin top-left)
  // PDF Y-axis points up → CSS Y-axis points down
  const cssLeft = minXPdf * scale;
  const cssTop = viewportHeight - maxYPdf * scale;
  const cssWidth = (maxXPdf - minXPdf) * scale;
  const cssHeight = (maxYPdf - minYPdf) * scale;

  return {
    x: cssLeft,
    y: cssTop,
    width: Math.max(cssWidth, 8),
    height: Math.max(cssHeight, 8),
  };
}

/**
 * Render a PDF page onto a canvas
 * @param {pdfjsLib.PDFPageProxy} page
 * @param {HTMLCanvasElement} canvas
 * @param {number} scale - render scale factor
 * @returns {Promise<{ viewport: Object, canvasWidth: number, canvasHeight: number }>}
 */
export async function renderPageToCanvas(page, canvas, scale = 1.5) {
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = viewport.width + 'px';
  canvas.style.height = viewport.height + 'px';

  const ctx = canvas.getContext('2d');
  await page.render({
    canvasContext: ctx,
    viewport: viewport,
  }).promise;

  return {
    viewport,
    canvasWidth: viewport.width,
    canvasHeight: viewport.height,
  };
}

/**
 * Get the page viewport without rendering
 * @param {pdfjsLib.PDFPageProxy} page
 * @param {number} scale
 * @returns {Object}
 */
export function getPageViewport(page, scale = 1) {
  return page.getViewport({ scale });
}
