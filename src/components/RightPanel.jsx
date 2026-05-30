// Right panel — entity list

import React, { useMemo } from 'react';
import { usePdf } from '../context/PdfContext';
import { ChevronDown, ChevronRight, Calendar, User } from 'lucide-react';

function EntityItem({ entity, isSelected, onClick }) {
  return (
    <div
      onClick={() => onClick(entity.id)}
      className={`group flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md cursor-pointer transition-all text-sm ${
        isSelected
          ? 'bg-blue-100 text-blue-800 font-semibold'
          : 'hover:bg-gray-100 text-gray-700'
      }`}
    >
      <span className="truncate flex-1">{entity.text}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${
        isSelected
          ? 'bg-blue-200 text-blue-700'
          : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'
      }`}>
        p.{entity.pageNum}
      </span>
    </div>
  );
}

function ToggleSection({ title, icon: Icon, entities, show, onToggle, selectedEntityId, onEntityClick, colorClass }) {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        {show ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        <Icon className={`w-4 h-4 ${colorClass}`} />
        <span className="font-medium text-sm text-gray-700">{title}</span>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${colorClass} bg-opacity-10`}
              style={{ backgroundColor: colorClass === 'text-yellow-600' ? 'rgba(250, 204, 21, 0.15)' : 'rgba(96, 165, 250, 0.15)' }}>
          {entities.length}
        </span>
      </button>

      {show && (
        <div className="pb-2 max-h-80 overflow-y-auto">
          {entities.length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-2">
              No {title.toLowerCase()} detected
            </p>
          ) : (
            entities.map(entity => (
              <EntityItem
                key={entity.id}
                entity={entity}
                isSelected={selectedEntityId === entity.id}
                onClick={onEntityClick}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function RightPanel() {
  const {
    entities,
    selectedEntityId,
    setSelectedEntityId,
    showDates,
    setShowDates,
    showNames,
    setShowNames,
    pdfDoc,
  } = usePdf();

  // Group entities
  const { dateEntities, nameEntities } = useMemo(() => {
    const dates = [];
    const names = [];
    for (const e of entities) {
      if (e.type === 'date') dates.push(e);
      else names.push(e);
    }
    return { dateEntities: dates, nameEntities: names };
  }, [entities]);

  const handleEntityClick = (entityId) => {
    setSelectedEntityId(entityId === selectedEntityId ? null : entityId);
  };

  if (!pdfDoc) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-gray-400 text-sm text-center">
          Upload a PDF to see detected entities here
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">
          Entities
          <span className="ml-1.5 text-xs font-normal text-gray-400">({entities.length} items)</span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ToggleSection
          title="Dates"
          icon={Calendar}
          entities={dateEntities}
          show={showDates}
          onToggle={() => setShowDates(!showDates)}
          selectedEntityId={selectedEntityId}
          onEntityClick={handleEntityClick}
          colorClass="text-yellow-600"
        />

        <ToggleSection
          title="Names"
          icon={User}
          entities={nameEntities}
          show={showNames}
          onToggle={() => setShowNames(!showNames)}
          selectedEntityId={selectedEntityId}
          onEntityClick={handleEntityClick}
          colorClass="text-blue-600"
        />
      </div>
    </div>
  );
}
