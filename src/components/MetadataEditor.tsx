import React, { useState, useEffect } from "react";
import { ExifTag, MetadataInfo } from "./MetadataView";

interface MetadataEditorProps {
  metadata: MetadataInfo;
  onSave: (newTags: ExifTag[]) => void;
  onCancel: () => void;
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({ metadata, onSave, onCancel }) => {
  const [tags, setTags] = useState<ExifTag[]>([]);

  useEffect(() => {
    // Deep clone tags for editing so we don't mutate the original metadata prop
    setTags(metadata.exif_tags.map(t => ({ ...t })));
  }, [metadata]);

  const handleValueChange = (index: number, newValue: string) => {
    const updated = [...tags];
    updated[index] = { ...updated[index], value: newValue };
    setTags(updated);
  };

  const handleAddTag = () => {
    setTags([...tags, { tag: "New Tag", description: "Custom Field", value: "" }]);
  };

  const handleRemoveTag = (index: number) => {
    const updated = [...tags];
    updated.splice(index, 1);
    setTags(updated);
  };

  const handleTagNameChange = (index: number, newTag: string) => {
    const updated = [...tags];
    updated[index] = { ...updated[index], tag: newTag, description: newTag };
    setTags(updated);
  }

  const computeDiff = () => {
    const originalMap = new Map(metadata.exif_tags.map(t => [t.tag, t.value]));
    const currentMap = new Map(tags.map(t => [t.tag, t.value]));
    
    const diff: ExifTag[] = [];
    
    // Check for modified or added tags
    for (const t of tags) {
      if (!originalMap.has(t.tag) || originalMap.get(t.tag) !== t.value) {
        diff.push(t);
      }
    }
    
    // Check for removed tags
    for (const t of metadata.exif_tags) {
      if (!currentMap.has(t.tag)) {
        diff.push({ tag: t.tag, description: t.description, value: "" });
      }
    }
    
    return diff;
  };

  return (
    <div className="metadata-panel">
      <div className="file-info-bar" style={{ borderColor: "var(--accent-primary)" }}>
        <div className="file-details">
          <div className="file-name">Editing: {metadata.file_name}</div>
          <div className="file-meta-stats">
            <span>Make changes below and click Save</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={onCancel} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            Cancel
          </button>
          <button className="btn-primary" onClick={() => onSave(computeDiff())} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            Save Changes
          </button>
        </div>
      </div>

      <div className="tags-scroll-container">
        <div className="tags-editor-list" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {tags.map((tag, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.5rem', borderRadius: '0', border: '1px solid var(--border-color)' }}>
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600 }}>TAG NAME</label>
                <input 
                  type="text" 
                  value={tag.tag}
                  onChange={(e) => handleTagNameChange(idx, e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem' }} 
                />
              </div>
              <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.7rem', color: '#00ff88', fontWeight: 600 }}>VALUE</label>
                <input 
                  type="text" 
                  value={tag.value}
                  onChange={(e) => handleValueChange(idx, e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '0', padding: '0.3rem 0.5rem', color: 'var(--text-primary)', width: '100%' }}
                />
              </div>
              <button 
                onClick={() => handleRemoveTag(idx)}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer', padding: '0.5rem' }}
                title="Remove Tag"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          ))}
          <button onClick={handleAddTag} className="btn-secondary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
            + Add Metadata Field
          </button>
        </div>
      </div>
    </div>
  );
};
