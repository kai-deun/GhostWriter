import React from "react";

interface ActionBarProps {
  onScrub: () => void;
  onClear: () => void;
  onEdit: () => void;
  canScrub: boolean;
}

export const ActionBar: React.FC<ActionBarProps> = ({ onScrub, onClear, onEdit, canScrub }) => {
  return (
    <div className="action-bar-container">
      <button className="btn-secondary" onClick={onClear}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        Clear File
      </button>
      <div className="button-group">
        <button className="btn-secondary" onClick={onEdit} disabled={!canScrub} style={{ borderColor: "#00ff88", color: "#00ff88" }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit Metadata
        </button>
        <button className="btn-primary" onClick={onScrub} disabled={!canScrub}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Scrub Metadata
        </button>
      </div>
    </div>
  );
};
