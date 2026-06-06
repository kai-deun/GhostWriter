import React from "react";

export interface ExifTag {
  tag: string;
  description: string;
  value: string;
  is_read_only?: boolean;
}

export interface MetadataInfo {
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  exif_tags: ExifTag[];
}

interface MetadataViewProps {
  metadata: MetadataInfo;
}

export const MetadataView: React.FC<MetadataViewProps> = ({ metadata }) => {
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const hasExif = metadata.exif_tags.length > 0;

  return (
    <div className="metadata-panel">
      <div className="file-info-bar">
        <div className="file-details">
          <div className="file-name">{metadata.file_name}</div>
          <div className="file-meta-stats">
            <span>Size: {formatBytes(metadata.file_size_bytes)}</span>
            <span>•</span>
            <span>Type: {metadata.mime_type}</span>
          </div>
        </div>
        <div>
          {hasExif ? (
            <span className="badge badge-warning">Contains EXIF</span>
          ) : (
            <span className="badge badge-success">Clean / No EXIF</span>
          )}
        </div>
      </div>

      <div className="tags-scroll-container">
        {hasExif ? (
          <div className="tags-grid">
            {metadata.exif_tags.map((tag, idx) => (
              <div className="tag-card" key={idx}>
                <span className="tag-label">{tag.description}</span>
                <span className="tag-val">{tag.value}</span>
                <span className="tag-raw">{tag.tag}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-tags-state">
            <div className="empty-tags-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ stroke: "#00ff88" }}
              >
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <h3 style={{ color: "var(--text-primary)", marginBottom: "0.25rem" }}>No Metadata Found</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "360px" }}>
              This image is clean. It does not contain any GPS location, camera details, or date history.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
