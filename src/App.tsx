import { useState } from "react";
import { Dropzone, SelectedFilePayload } from "./components/Dropzone";
import { MetadataView, MetadataInfo, ExifTag } from "./components/MetadataView";
import { MetadataEditor } from "./components/MetadataEditor";
import { ActionBar } from "./components/ActionBar";
import { parseMetadata, writeMetadata } from "./utils/metadataParser";
import "./styles.css";

function App() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [webFile, setWebFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<MetadataInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileSelected = async (payload: SelectedFilePayload) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setIsEditing(false);

    try {
      if (payload.file) {
        const file = payload.file;
        const result = await parseMetadata(file);
        setMetadata(result);
        setWebFile(file);
      }
    } catch (err: any) {
      setError(err.message || err || "Failed to read file metadata");
    } finally {
      setLoading(false);
    }
  };

  const handleScrub = async () => {
    await performAction(true, []);
  };

  const handleSaveEdit = async (updatedTags: ExifTag[]) => {
    await performAction(false, updatedTags);
  };

  const performAction = async (scrubAll: boolean, updatedTags: ExifTag[]) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (webFile && metadata) {
        const { url: objectUrl, warnings } = await writeMetadata(webFile, updatedTags, scrubAll);
        
        const dotIndex = webFile.name.lastIndexOf(".");
        const baseName = dotIndex !== -1 ? webFile.name.slice(0, dotIndex) : webFile.name;
        const ext = dotIndex !== -1 ? webFile.name.slice(dotIndex) : "";
        const actionStr = scrubAll ? "_cleaned" : "_edited";
        const defaultPath = `${baseName}${actionStr}${ext}`;

        // Trigger download
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = defaultPath;
        a.click();

        if (warnings && warnings.length > 0) {
          setError(warnings.join("\n"));
          setSuccess(`Metadata mostly ${scrubAll ? 'scrubbed' : 'saved'} (some custom tags ignored)`);
        } else {
          setSuccess(`Metadata ${scrubAll ? 'scrubbed' : 'saved'} and saved successfully!`);
        }
        setIsEditing(false);
      }
    } catch (err: any) {
      setError(err.message || err || "Failed to process metadata");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFilePath(null);
    setWebFile(null);
    setMetadata(null);
    setError(null);
    setSuccess(null);
    setIsEditing(false);
  };

  const hasExif = metadata && metadata.exif_tags.length > 0;

  return (
    <div className="app-container">
      <div className="header">
        <div>
          <h1>Local Metadata Editor</h1>
          <p className="header-subtitle">Secure, local-only universal metadata reader & editor</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {error && <div className="toast toast-error">{error}</div>}
          {success && <div className="toast toast-success">{success}</div>}
        </div>
      </div>

      <div className="main-content">
        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p style={{ fontWeight: 500, color: "var(--text-secondary)" }}>
              Processing document data...
            </p>
          </div>
        )}

        {(!filePath && !webFile) || !metadata ? (
          <Dropzone onFileSelected={handleFileSelected} />
        ) : (
          <>
            {isEditing ? (
              <MetadataEditor 
                metadata={metadata} 
                onSave={handleSaveEdit} 
                onCancel={() => setIsEditing(false)} 
              />
            ) : (
              <>
                <MetadataView metadata={metadata} />
                <ActionBar
                  onScrub={handleScrub}
                  onClear={handleClear}
                  onEdit={() => setIsEditing(true)}
                  canScrub={!!hasExif}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
