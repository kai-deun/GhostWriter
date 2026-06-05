import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { Dropzone, SelectedFilePayload } from "./components/Dropzone";
import { MetadataView, MetadataInfo, ExifTag } from "./components/MetadataView";
import { MetadataEditor } from "./components/MetadataEditor";
import { ActionBar } from "./components/ActionBar";
import { isTauri } from "./utils/env";
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
      if (isTauri() && payload.path) {
        // We still fall back to Web APIs for PDF/DOCX even in Tauri if Rust backend doesn't support it natively yet
        // but for now let's just route to Web APIs for all complex formats if File object is provided
      }
      
      if (payload.file) {
        const file = payload.file;
        const result = await parseMetadata(file);
        setMetadata(result);
        setWebFile(file);
        setFilePath(null);
      } else if (payload.path) {
        const result: MetadataInfo = await invoke("get_metadata", { path: payload.path });
        setMetadata(result);
        setFilePath(payload.path);
        setWebFile(null);
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
        const objectUrl = await writeMetadata(webFile, updatedTags, scrubAll);
        
        // Trigger download
        const a = document.createElement("a");
        a.href = objectUrl;
        const dotIndex = webFile.name.lastIndexOf(".");
        const baseName = dotIndex !== -1 ? webFile.name.slice(0, dotIndex) : webFile.name;
        const ext = dotIndex !== -1 ? webFile.name.slice(dotIndex) : "";
        const actionStr = scrubAll ? "_cleaned" : "_edited";
        a.download = `${baseName}${actionStr}${ext}`;
        a.click();
        
        setSuccess(`Metadata ${scrubAll ? 'scrubbed' : 'saved'} and downloaded successfully!`);
        setIsEditing(false);
      } else if (isTauri() && filePath && metadata) {
        // Tauri native save
        const dotIndex = metadata.file_name.lastIndexOf(".");
        const baseName = dotIndex !== -1 ? metadata.file_name.slice(0, dotIndex) : metadata.file_name;
        const ext = dotIndex !== -1 ? metadata.file_name.slice(dotIndex) : ".jpg";
        const actionStr = scrubAll ? "_cleaned" : "_edited";
        const defaultPath = `${baseName}${actionStr}${ext}`;

        const savePath = await save({
          defaultPath,
          filters: [{ name: "Files", extensions: ["jpg", "jpeg", "png", "pdf", "docx"] }],
        });

        if (!savePath) {
          setLoading(false);
          return;
        }

        if (scrubAll) {
          await invoke("scrub_metadata", { path: filePath, savePath });
        } else {
          // Note: Full Rust editing requires backend support which is beyond MVP. 
          // Suggesting Web fallback.
          throw new Error("Native metadata editing in Tauri is currently restricted. Please drag and drop the file directly to use Web mode.");
        }

        setSuccess(`Metadata ${scrubAll ? 'scrubbed' : 'saved'} and file saved successfully!`);
        await handleFileSelected({ path: savePath });
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
          <Dropzone onFileSelected={handleFileSelected} onError={setError} />
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
