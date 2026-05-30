// Left panel — page thumbnails

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePdf } from '../context/PdfContext';

const THUMB_SCALE = 0.2; // thumbnail scale factor

function Thumbnail({ pageNum, pdfDoc, isActive, onClick }) {
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas || !pdfDoc) return;

    pdfDoc.getPage(pageNum).then(page => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: THUMB_SCALE });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      return page.render({ canvasContext: ctx, viewport }).promise;
    }).then(() => {
      if (!cancelled) setLoaded(true);
    }).catch(err => {
      console.error(`Thumbnail render failed (page ${pageNum}):`, err);
    });

    return () => { cancelled = true; };
  }, [pdfDoc, pageNum]);

  return (
    <div
      className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 mb-3 hover:shadow-md ${
        isActive
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-300'
          : 'border-gray-200 hover:border-gray-400'
      }`}
      onClick={() => onClick(pageNum)}
    >
      <div className="relative bg-white">
        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ opacity: loaded ? 1 : 0.3 }}
        />
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </div>
      <div className={`text-center py-1 text-xs font-medium ${
        isActive ? 'bg-blue-500 text-white' : 'bg-gray-50 text-gray-600'
      }`}>
        Page {pageNum}
      </div>
    </div>
  );
}

export default function LeftPanel() {
  const { pdfDoc, numPages, currentPage, setCurrentPage } = usePdf();
  const containerRef = useRef(null);

  // When current page changes, scroll the thumbnail into view
  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentPage]);

  const handleThumbnailClick = useCallback((pageNum) => {
    setCurrentPage(pageNum);
  }, [setCurrentPage]);

  if (!pdfDoc) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-gray-400 text-sm text-center">
          Upload a PDF to see page thumbnails here
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">
          Page Thumbnails
          <span className="ml-1.5 text-xs font-normal text-gray-400">({numPages} pages)</span>
        </h2>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 scrollbar-thin"
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
          <div key={pageNum} data-active={pageNum === currentPage || undefined}>
            <Thumbnail
              pageNum={pageNum}
              pdfDoc={pdfDoc}
              isActive={pageNum === currentPage}
              onClick={handleThumbnailClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
