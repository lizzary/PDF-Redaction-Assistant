// PDF context — manages all shared application state

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { loadPdf, extractPageTextItems, getPageViewport, findEntityBoundingBox, getPageText } from '../utils/pdfUtils';
import { extractEntities } from '../utils/entityExtractor';

const PdfContext = createContext(null);

let entityIdCounter = 0;
function generateEntityId() {
  return `entity-${++entityIdCounter}`;
}

export function PdfProvider({ children }) {
  const [pdfDoc, setPdfDoc] = useState(null);         // pdfjs document object
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [entities, setEntities] = useState([]);        // all detected entities
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [showDates, setShowDates] = useState(true);    // date section expanded state
  const [showNames, setShowNames] = useState(true);    // name section expanded state
  const [isLoading, setIsLoading] = useState(false);   // loading state
  const [error, setError] = useState(null);

  // Cache page text items to avoid re-parsing
  const pageTextItemsCache = useRef({});
  // Cache page text
  const pageTextCache = useRef({});

  /**
   * Load and parse a PDF file
   */
  const loadPdfFile = useCallback(async (file) => {
    setIsLoading(true);
    setError(null);
    setEntities([]);
    setSelectedEntityId(null);
    setCurrentPage(1);
    pageTextItemsCache.current = {};
    pageTextCache.current = {};
    entityIdCounter = 0;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const doc = await loadPdf(arrayBuffer);
      setPdfDoc(doc);
      setNumPages(doc.numPages);

      // Extract text and entities page by page
      const allEntities = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const textItems = await extractPageTextItems(page);
        const text = textItems.map(item => item.str).join(' ');
        pageTextItemsCache.current[i] = textItems;
        pageTextCache.current[i] = text;

        const pageEntities = extractEntities(text, i);
        for (const entity of pageEntities) {
          allEntities.push({
            ...entity,
            id: generateEntityId(),
          });
        }
      }

      setEntities(allEntities);
    } catch (err) {
      console.error('PDF load failed:', err);
      setError('Failed to load PDF. Please ensure the file is a valid PDF.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get highlight bounding box coordinates for a specific entity
   */
  const getEntityHighlights = useCallback(async (entity) => {
    const textItems = pageTextItemsCache.current[entity.pageNum];
    if (!textItems) return [];

    const page = await pdfDoc.getPage(entity.pageNum);
    const viewport = getPageViewport(page, 1.5); // must match CenterPanel RENDER_SCALE

    const bbox = findEntityBoundingBox(
      textItems,
      entity.startIndex,
      entity.endIndex,
      viewport.height,
      1.5
    );

    return bbox ? [{ ...bbox, pageNum: entity.pageNum }] : [];
  }, [pdfDoc]);

  /**
   * Get highlight regions for all entities on a given page
   */
  const getPageHighlights = useCallback(async (pageNum) => {
    const pageEntities = entities.filter(e => e.pageNum === pageNum);
    const textItems = pageTextItemsCache.current[pageNum];
    if (!textItems || pageEntities.length === 0) return [];

    const page = await pdfDoc.getPage(pageNum);
    const viewport = getPageViewport(page, 1.5);

    const highlights = [];
    for (const entity of pageEntities) {
      const bbox = findEntityBoundingBox(
        textItems,
        entity.startIndex,
        entity.endIndex,
        viewport.height,
        1.5
      );
      if (bbox) {
        highlights.push({
          entityId: entity.id,
          type: entity.type,
          text: entity.text,
          ...bbox,
          pageNum,
        });
      }
    }
    return highlights;
  }, [entities, pdfDoc]);

  /**
   * Clear the currently loaded PDF and reset all state
   */
  const clearPdf = useCallback(() => {
    setPdfDoc(null);
    setNumPages(0);
    setCurrentPage(1);
    setEntities([]);
    setSelectedEntityId(null);
    setIsLoading(false);
    setError(null);
    pageTextItemsCache.current = {};
    pageTextCache.current = {};
    entityIdCounter = 0;
  }, []);

  const value = {
    pdfDoc,
    numPages,
    currentPage,
    setCurrentPage,
    entities,
    selectedEntityId,
    setSelectedEntityId,
    showDates,
    setShowDates,
    showNames,
    setShowNames,
    isLoading,
    error,
    loadPdfFile,
    clearPdf,
    getEntityHighlights,
    getPageHighlights,
    pageTextItemsCache,
  };

  return (
    <PdfContext.Provider value={value}>
      {children}
    </PdfContext.Provider>
  );
}

export function usePdf() {
  const context = useContext(PdfContext);
  if (!context) {
    throw new Error('usePdf must be used within a PdfProvider');
  }
  return context;
}

export default PdfContext;
