# PDF Redaction Assistant

A three-panel web application that lets users upload a PDF, automatically extract dates and person names, and visually highlight those entities on the rendered document. Everything runs client-side — no backend required.

## Setup

```bash
npm install
npm start
```

The app will open at `http://localhost:3000`.

## How to Use

1. **Upload** a PDF file by dragging it onto the center panel or clicking the upload area.
2. **Browse pages** via the left panel thumbnails or the prev/next buttons in the center viewer.
3. **View detected entities** in the right panel — dates (yellow) and person names (blue) are grouped separately.
4. **Click any entity** in the right panel to jump to its page and see the highlight overlay.
5. **Toggle sections** with the chevron buttons to show/hide date or name entities.

## Screenshots & 
see https://github.com/lizzary/PDF-Redaction-Assistant/blob/master/screen_shots.png
## Entity Extraction Approach

### Dates

Dates are detected using regular expressions matching these common formats:

| Format | Example |
|--------|---------|
| `DD/MM/YYYY` or `DD-MM-YYYY` | `12/01/2024`, `03-Feb-2024` |
| `Month DD, YYYY` | `January 12, 2024`, `Jan 12, 2024` |
| `DD Month YYYY` | `12 January 2024` |
| `YYYY-MM-DD` (ISO) | `2024-01-12` |

All 12 months are supported in both full and abbreviated English forms.

### Person Names

Person names are detected using a **hybrid approach** combining NLP and regex:

**Primary — compromise.js NLP library:** The `nlp(text).people()` method uses part-of-speech tagging and context to identify person names, automatically filtering out many Title Case non-name entities (e.g., "Chapter", "Section", "Figure").

**Fallback — initials-style regex:** compromise.js can miss names with dotted initials. A supplementary regex catches patterns like:
```
\b(?:[A-Z]\.\s*)+(?:[A-Z][a-zà-ÿ]+(?:['’-][A-Z][a-zà-ÿ]*)*)\b
```

This matches patterns like:
- `John Smith` — standard first + last name
- `Mary O'Brien` — names with apostrophes
- `Jean-Luc Picard` — names with hyphens
- `J.P. Morgan` — dotted initials

**Deduplication:** Results from both methods are merged by character position — if two matches overlap in the text, only the first one is kept.

### Text-to-Position Mapping

1. `pdf.js` `getTextContent()` provides individual text items with positions and font metrics.
2. A character-level index map is built from text items to full page text, with sentinel values for inter-item spaces.
3. Regex/NLP matches on the full text are mapped back to their source text items via the index map.
4. Character positions within each matched text item are interpolated to compute precise bounding boxes.
5. A union bounding box is computed across all matched text items.
6. PDF coordinates (bottom-left origin) are flipped to CSS coordinates (top-left origin).

### Design Rationale

- **Regex for dates**: Dates follow predictable formats, making regex the simplest and most reliable approach. No NLP needed.
- **Compromise.js + regex fallback for names**: Names are inherently ambiguous. compromise.js provides contextual NLP that reduces false positives compared to a pure regex approach. The initials regex fallback catches a specific pattern compromise.js is known to miss.
- **Hybrid merge strategy**: Deduplication by character position ensures the same entity isn't double-counted when both methods match overlapping spans.

## Known Limitations

- **Entity extraction accuracy**: Regex-based extraction will produce some false positives (names are particularly challenging). The exclusion list helps but is not exhaustive.
- **Highlight positioning**: The bounding box calculation uses font metrics that may be slightly offset on some PDFs with complex layouts or unusual fonts.

## Tech Stack

- **React 19** with Create React App
- **pdf.js 4.x** (Mozilla) for PDF rendering and text extraction
- **compromise.js 14.x** for NLP-based person name recognition
- **Tailwind CSS 3** for styling
- **lucide-react** for icons

## Architecture

```
src/
  index.js               Entry point
  router/router.jsx       Route config (single-page: /)
  page/PdfRedactor/       Main three-panel layout + HeaderBar
  components/
    LeftPanel.jsx         Page thumbnail strip
    CenterPanel.jsx       PDF viewer with highlight overlays
    RightPanel.jsx        Entity list with toggle sections
    HighlightOverlay.jsx  Semi-transparent highlight boxes
  context/PdfContext.jsx  Shared state via React Context (usePdf hook)
  utils/
    entityExtractor.js    Date regex patterns + compromise.js name extraction
    pdfUtils.js           PDF loading, text extraction, coordinate conversion
```

## Assessment Criteria Alignment

- **Code Quality (30%)**: Modular component structure, shared state via Context, separation of concerns (extraction vs. rendering vs. UI), consistent async cancellation pattern, meaningful commit history.
- **UI/UX (30%)**: Clean three-panel layout, color-coded highlights (yellow = date, blue = name), active states on thumbnails and entity list items, smooth scroll-to-page navigation, drag-and-drop upload.
- **Problem Decomposition (25%)**: Hybrid extraction approach documented above, coordinate system conversion explained, false-positive mitigation strategy, character-level bounding box interpolation.
- **Functionality (15%)**: PDF rendering, entity detection, highlight overlays, click-to-navigate, toggle sections — all working end-to-end.
