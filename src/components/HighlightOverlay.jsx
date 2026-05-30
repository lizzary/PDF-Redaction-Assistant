// Highlight overlay — semi-transparent highlight on the PDF canvas

import React from 'react';

/**
 * Get highlight style based on entity type
 */
function getHighlightStyle(type) {
  if (type === 'date') {
    return {
      backgroundColor: 'rgba(250, 204, 21, 0.35)',
      borderColor: 'rgba(234, 179, 8, 0.7)',
    };
  }
  return {
    backgroundColor: 'rgba(96, 165, 250, 0.35)',
    borderColor: 'rgba(59, 130, 246, 0.7)',
  };
}

export default function HighlightOverlay({ highlight, isSelected, onClick }) {
  const { x, y, width, height, type } = highlight;
  const { backgroundColor, borderColor } = getHighlightStyle(type);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(highlight);
      }}
      className="absolute cursor-pointer transition-all duration-150 rounded-sm border"
      style={{
        left: x,
        top: y,
        width,
        height,
        backgroundColor,
        borderColor,
        borderWidth: isSelected ? '2px' : '1px',
        boxShadow: isSelected ? `0 0 0 2px ${borderColor}` : 'none',
        zIndex: isSelected ? 20 : 10,
      }}
      title={`${highlight.type === 'date' ? 'Date' : 'Name'}: ${highlight.text}`}
    />
  );
}
