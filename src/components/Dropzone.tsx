import React, { useEffect, useState, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "../utils/env";

export interface SelectedFilePayload {
  path?: string;
  file?: File;
}

interface DropzoneProps {
  onFileSelected: (payload: SelectedFilePayload) => void;
  onError: (error: string) => void;
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

const getTauriFilters = (filter: FilterType) => {
  switch (filter) {
    case "image": return [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "gif", "tif", "tiff", "heic", "heif", "raw"] }];
    case "video": return [{ name: "Videos", extensions: ["mp4", "mkv", "avi", "mov", "webm", "m4v"] }];
    case "audio": return [{ name: "Audio", extensions: ["mp3", "wav", "ogg", "flac", "m4a"] }];
    case "document": return [{ name: "Documents", extensions: ["pdf"] }];
    default: return [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "gif", "tif", "tiff", "heic", "heif", "raw"] }];
  }
};

export const Dropzone: React.FC<DropzoneProps> = ({ onFileSelected, onError }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [filter, setFilter] = useState<FilterType>("image");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isTauri()) return;

    let unlistenDragOver: (() => void) | undefined;
    let unlistenDragDrop: (() => void) | undefined;
    let unlistenDragCancelled: (() => void) | undefined;

    async function setupListeners() {
      try {
        unlistenDragOver = await listen("tauri://drag-over", () => {
          setIsDragActive(true);
        });

        unlistenDragCancelled = await listen("tauri://drag-cancelled", () => {
          setIsDragActive(false);
        });

        unlistenDragDrop = await listen<{ paths: string[] }>("tauri://drag-drop", (event) => {
          setIsDragActive(false);
          const paths = event.payload.paths;
          if (paths && paths.length > 0) {
            onFileSelected({ path: paths[0] });
          }
        });
      } catch (err) {
        console.error("Failed to setup drag & drop listeners:", err);
      }
    }

    setupListeners();

    return () => {
      if (unlistenDragOver) unlistenDragOver();
      if (unlistenDragCancelled) unlistenDragCancelled();
      if (unlistenDragDrop) unlistenDragDrop();
    };
  }, [onFileSelected]);

  const handleSelectFile = async () => {
    if (isTauri()) {
      try {
        const selected = await open({
          multiple: false,
          filters: getTauriFilters(filter),
        });

        if (selected) {
          const filePath = Array.isArray(selected) ? selected[0] : selected;
          if (filePath) {
            onFileSelected({ path: filePath });
          }
        }
      } catch (err: any) {
        onError(err.message || "Failed to open file dialog");
      }
    } else {
      // Web native file picker
      fileInputRef.current?.click();
    }
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
    if (isTauri()) return;
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleWebDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (isTauri()) return;
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleWebDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (isTauri()) return;
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
