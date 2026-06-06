import React, { useState, useRef } from "react";

export interface SelectedFilePayload {
  path?: string;
  file?: File;
}

interface DropzoneProps {
  onFileSelected: (payload: SelectedFilePayload) => void;
}

type FilterType = "image" | "video" | "audio" | "document";

const getWebAccept = (filter: FilterType) => {
  switch (filter) {
    case "image": return "image/*,.heic,.heif";
    case "video": return "video/*";
    case "audio": return "audio/*";
    case "document": return "application/pdf,.pdf";
    default: return "image/*,.heic,.heif";
  }
};



export const Dropzone: React.FC<DropzoneProps> = ({ onFileSelected }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [filter, setFilter] = useState<FilterType>("image");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleWebFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelected({ file: files[0] });
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const handleWebDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleWebDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleWebDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelected({ file: e.dataTransfer.files[0] });
    }
  };

  const handleFilterClick = (e: React.MouseEvent, type: FilterType) => {
    e.stopPropagation();
    setFilter(type);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(["image", "video", "audio", "document"] as FilterType[]).map(t => (
          <button 
            key={t}
            onClick={(e) => handleFilterClick(e, t)}
            className={`btn-secondary ${filter === t ? 'active' : ''}`}
            style={{ 
              textTransform: 'capitalize', 
              fontSize: '0.85rem', 
              padding: '0.4rem 0.8rem',
              backgroundColor: filter === t ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: filter === t ? 'white' : 'var(--text-secondary)'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div
        className={`dropzone-container ${isDragActive ? "drag-active" : ""}`}
        onClick={handleSelectFile}
        onDragOver={handleWebDragOver}
        onDragLeave={handleWebDragLeave}
        onDrop={handleWebDrop}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept={getWebAccept(filter)}
          onChange={handleWebFileChange}
        />
        <div className="dropzone-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className="dropzone-text">
          <h3 className="dropzone-title">Drag & drop your {filter} here</h3>
          <p className="dropzone-desc">
            Click to browse for {filter} files
          </p>
        </div>
      </div>
    </div>
  );
};
