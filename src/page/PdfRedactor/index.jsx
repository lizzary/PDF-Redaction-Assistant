// PDF Redactor main page — three-panel layout

import React from 'react';
import { PdfProvider, usePdf } from '../../context/PdfContext';
import LeftPanel from '../../components/LeftPanel';
import CenterPanel from '../../components/CenterPanel';
import RightPanel from '../../components/RightPanel';
import { FileText, X } from 'lucide-react';

function HeaderBar() {
  const { pdfDoc, clearPdf } = usePdf();

  return (
    <header className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white shrink-0">
      <FileText className="w-5 h-5" />
      <h1 className="text-sm font-semibold flex-1">PDF Redaction Assistant</h1>
      {pdfDoc && (
        <button
          onClick={clearPdf}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-red-600 rounded transition-colors"
          title="Clear current PDF"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
    </header>
  );
}

export default function PdfRedactor() {
  return (
    <PdfProvider>
      <div className="h-screen flex flex-col bg-white">
        <HeaderBar />

        {/* Three-panel layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel — thumbnails */}
          <aside className="w-48 shrink-0 border-r border-gray-200 bg-white overflow-hidden">
            <LeftPanel />
          </aside>

          {/* Center panel — PDF viewer */}
          <main className="flex-1 overflow-hidden bg-gray-100">
            <CenterPanel />
          </main>

          {/* Right panel — entity list */}
          <aside className="w-72 shrink-0 border-l border-gray-200 bg-white overflow-hidden">
            <RightPanel />
          </aside>
        </div>
      </div>
    </PdfProvider>
  );
}
