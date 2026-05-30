// Center panel — PDF viewer and upload area

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { usePdf } from '../context/PdfContext';
import { renderPageToCanvas, getPageViewport } from '../utils/pdfUtils';
import { findEntityBoundingBox } from '../utils/pdfUtils';
import HighlightOverlay from './HighlightOverlay';
import { Upload } from 'lucide-react';

const RENDER_SCALE = 1.5;

export default function CenterPanel() {
  const {
    pdfDoc,
    numPages,
    currentPage,
    setCurrentPage,
    entities,
    selectedEntityId,
    setSelectedEntityId,
    loadPdfFile,
    isLoading,
    error,
    pageTextItemsCache,
  } = usePdf();

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [highlights, setHighlights] = useState([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [rendering, setRendering] = useState(false);

  // Render current page
  useEffect(() => {
    if (!pdfDoc) return;

    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setRendering(true);

    pdfDoc.getPage(currentPage).then(async (page) => {
      if (cancelled) return;
      const result = await renderPageToCanvas(page, canvas, RENDER_SCALE);
      if (!cancelled) {
        setCanvasSize({
          width: result.canvasWidth,
          height: result.canvasHeight,
        });
      }
    }).catch(err => {
      console.error('Page render failed:', err);
    }).finally(() => {
      if (!cancelled) setRendering(false);
    });

    return () => { cancelled = true; };
  }, [pdfDoc, currentPage]);

  // Compute highlight regions for current page
  useEffect(() => {
    if (!pdfDoc || !canvasSize.width) {
      setHighlights([]);
      return;
    }

    let cancelled = false;

    async function computeHighlights() {
      const pageEntities = entities.filter(e => e.pageNum === currentPage);
      if (pageEntities.length === 0) {
        setHighlights([]);
        return;
      }

      const textItems = pageTextItemsCache.current[currentPage];
      if (!textItems) {
        setHighlights([]);
        return;
      }

      const page = await pdfDoc.getPage(currentPage);
      const viewport = getPageViewport(page, RENDER_SCALE);

      const result = [];
      for (const entity of pageEntities) {
        if (cancelled) break;

        // Compute highlights for all detected entities
        // (RightPanel controls which types are visible)
        const bbox = findEntityBoundingBox(
          textItems,
          entity.startIndex,
          entity.endIndex,
          viewport.height,
          RENDER_SCALE
        );
        if (bbox) {
          result.push({
            entityId: entity.id,
            type: entity.type,
            text: entity.text,
            ...bbox,
            pageNum: currentPage,
          });
        }
      }

      if (!cancelled) setHighlights(result);
    }

    computeHighlights();
    return () => { cancelled = true; };
  }, [pdfDoc, currentPage, entities, canvasSize, pageTextItemsCache]);

  // When selected entity changes, scroll to the corresponding highlight
  useEffect(() => {
    if (!selectedEntityId || !containerRef.current) return;

    const selectedEntity = entities.find(e => e.id === selectedEntityId);
    if (!selectedEntity) return;

    // If the entity is not on the current page, switch pages
    if (selectedEntity.pageNum !== currentPage) {
      setCurrentPage(selectedEntity.pageNum);
    }
  }, [selectedEntityId]); // only trigger when selectedEntityId changes

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      loadPdfFile(file);
    } else if (file) {
      alert('Please select a PDF file');
    }
    // Reset input to allow re-selecting the same file
    e.target.value = '';
  }, [loadPdfFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      loadPdfFile(file);
    }
  }, [loadPdfFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleHighlightClick = useCallback((highlight) => {
    setSelectedEntityId(highlight.entityId);
  }, [setSelectedEntityId]);

  // Mouse wheel to switch pages
  const handleWheel = useCallback((e) => {
    if (!pdfDoc || numPages <= 1) return;

    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const atTop = scrollTop <= 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 2;

    if ((e.deltaY < 0 && atTop && currentPage > 1) ||
        (e.deltaY > 0 && atBottom && currentPage < numPages)) {
      e.preventDefault();
      setCurrentPage(prev => e.deltaY > 0 ? prev + 1 : prev - 1);
    }
  }, [pdfDoc, numPages, currentPage, setCurrentPage]);

  // No PDF uploaded — show upload area
  if (!pdfDoc) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div
          className="w-full max-w-md border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-gray-500">Parsing PDF file...</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Upload PDF
              </p>
              <p className="text-sm text-gray-400 mb-4">
                Drag and drop a file here, or click to select
              </p>
              {error && (
                <p className="text-sm text-red-500 bg-red-50 rounded-lg p-3">
                  {error}
                </p>
              )}
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  // PDF loaded — show viewer
  return (
    <div className="h-full flex flex-col">
      {/* Page indicator */}
      <div className="flex items-center justify-center gap-3 p-2 bg-gray-50 border-b border-gray-200">
        <button
          className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        >
          ‹ Prev
        </button>
        <span className="text-sm font-medium text-gray-700">
          {currentPage} / {numPages}
        </span>
        <button
          className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          disabled={currentPage >= numPages}
          onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
        >
          Next ›
        </button>
      </div>

      {/* PDF view area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-200 p-4 flex justify-center"
        onWheel={handleWheel}
      >
        <div className="relative inline-block shadow-xl" style={{ minWidth: canvasSize.width }}>
          {rendering && (
            <div className="absolute inset-0 bg-white/60 z-30 flex items-center justify-center rounded">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="block"
          />
          {/* Highlight overlay container — same size as canvas */}
          <div
            className="absolute top-0 left-0"
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            {highlights.map((h, idx) => (
              <HighlightOverlay
                key={`${h.entityId}-${idx}`}
                highlight={h}
                isSelected={h.entityId === selectedEntityId}
                onClick={handleHighlightClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
