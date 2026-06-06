import MP3Tag from "mp3tag.js";
import Metaflac from "metaflac-js";
import { Buffer } from "buffer";
import { parseMetadata as exiftoolParse, writeMetadata as exiftoolWrite } from "@uswriting/exiftool";
import { ExifTag, MetadataInfo } from "../../components/MetadataView";
import { isReadOnlyTag } from "./common";

export async function parseAudioMetadata(file: File): Promise<MetadataInfo> {
  const name = file.name.toLowerCase();

  // WAV, M4A, and AAC files use ExifTool
  if (name.endsWith('.wav') || name.endsWith('.m4a') || name.endsWith('.aac')) {
    return parseExiftoolAudioMetadata(file);
  }

  // FLAC files use Metaflac
  if (name.endsWith('.flac')) {
    return parseFlacMetadata(file);
  }

  // MP3 files use MP3Tag
  const arrayBuffer = await file.arrayBuffer();
  const mp3tag = new MP3Tag(arrayBuffer);
  
  mp3tag.read();
  
  const tags: ExifTag[] = [];
  
  if (mp3tag.tags.v2) {
    for (const [key, value] of Object.entries(mp3tag.tags.v2)) {
      if (typeof value === 'string' || typeof value === 'number') {
        tags.push({ tag: key, description: key, value: String(value) });
      } else if (Array.isArray(value)) {
        tags.push({ tag: key, description: key, value: value.join(', ') });
      }
    }
  } else if (mp3tag.tags.v1) {
    for (const [key, value] of Object.entries(mp3tag.tags.v1)) {
      if (typeof value === 'string' || typeof value === 'number') {
        tags.push({ tag: key, description: key, value: String(value) });
      }
    }
  } else {
    // Check aliases if no v2/v1 explicitly found
    const aliases = ['title', 'artist', 'album', 'year', 'comment', 'track', 'genre'];
    for (const alias of aliases) {
      if ((mp3tag.tags as any)[alias]) {
        tags.push({ tag: alias, description: alias, value: String((mp3tag.tags as any)[alias]) });
      }
    }
  }

  // Deduplicate tags
  const uniqueTags: ExifTag[] = [];
  const seen = new Set();
  for (const t of tags) {
    if (!seen.has(t.tag)) {
      seen.add(t.tag);
      uniqueTags.push(t);
    }
  }

  return {
    file_name: file.name,
    file_size_bytes: file.size,
    mime_type: file.type || "audio/mpeg",
    exif_tags: uniqueTags,
  };
}

async function parseExiftoolAudioMetadata(file: File): Promise<MetadataInfo> {
  const result = await exiftoolParse(file, {
    args: ["-json"],
    transform: (data) => JSON.parse(data),
    fetch: (url: any, init: any) => {
      // Force fetching the WASM file from the public root
      if (url.toString().endsWith('.wasm')) {
        return fetch('/zeroperl.wasm', init);
      }
      return fetch(url, init);
    }
  });

  if (!result.success) {
    throw new Error(`Failed to parse audio metadata: ${result.error}`);
  }

  const exifData = Array.isArray(result.data) ? result.data[0] : result.data;
  const tags: ExifTag[] = [];

  if (exifData) {
    for (const [key, value] of Object.entries(exifData)) {
      const ignoredTags = [
        'SourceFile', 'Directory', 'FileName', 'FilePermissions', 'ExifToolVersion',
        'FileSize', 'FileModifyDate', 'FileAccessDate', 'FileInodeChangeDate',
        'FileType', 'FileTypeExtension', 'MIMEType', 'Error', 'Warning'
      ];
      if (ignoredTags.includes(key)) continue;
      
      if (typeof value === "string" && value.length > 300 && value.startsWith("base64:")) continue;

      tags.push({
        tag: key,
        description: key,
        value: String(value),
        is_read_only: isReadOnlyTag(key),
      });
    }
  }

  // Deduplicate
  const uniqueTags: ExifTag[] = [];
  const seen = new Set();
  for (const t of tags) {
    if (!seen.has(t.description)) {
      seen.add(t.description);
      uniqueTags.push(t);
    }
  }

  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const defaultMime = ext === '.wav' ? 'audio/wav' : (ext === '.m4a' ? 'audio/mp4' : 'audio/aac');

  return {
    file_name: file.name,
    file_size_bytes: file.size,
    mime_type: file.type || defaultMime,
    exif_tags: uniqueTags,
  };
}

async function parseFlacMetadata(file: File): Promise<MetadataInfo> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const flac = new Metaflac(buffer);
  
  const tags: ExifTag[] = [];
  const rawTags = flac.getAllTags();
  for (const tagString of rawTags) {
    const parts = tagString.split('=');
    if (parts.length >= 2) {
      const key = parts[0];
      const value = parts.slice(1).join('=');
      tags.push({ tag: key, description: key, value });
    }
  }

  return {
    file_name: file.name,
    file_size_bytes: file.size,
    mime_type: file.type || "audio/flac",
    exif_tags: tags,
  };
}

export async function writeAudioMetadata(file: File, updatedTags: ExifTag[], scrubAll: boolean): Promise<{ url: string, warnings: string[] }> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.wav')) {
    throw new Error(`${file.name} is a WAV file (RIFF format), which has write restrictions in this application. Saving or stripping metadata for WAV files is not supported by ExifTool.`);
  }

  if (name.endsWith('.m4a') || name.endsWith('.aac')) {
    return writeExiftoolAudioMetadata(file, updatedTags, scrubAll);
  }

  if (name.endsWith('.flac')) {
    return writeFlacMetadata(file, updatedTags, scrubAll);
  }

  const arrayBuffer = await file.arrayBuffer();
  const mp3tag = new MP3Tag(arrayBuffer);
  
  mp3tag.read();

  if (scrubAll) {
    (mp3tag.tags as any).v1 = { title: "", artist: "", album: "", year: "", comment: "", genre: "" };
    (mp3tag.tags as any).v2 = {};
    mp3tag.tags.title = "";
    mp3tag.tags.artist = "";
    mp3tag.tags.album = "";
    mp3tag.tags.year = "";
    mp3tag.tags.comment = "";
    mp3tag.tags.track = "";
    mp3tag.tags.genre = "";
  } else {
    // Ensure we have a v2 object to write into
    if (!mp3tag.tags.v2) {
      mp3tag.tags.v2 = {};
    }
    
    // Convert common aliases to v2 frames if user types them
    const aliasToFrame: Record<string, string> = {
      'title': 'TIT2',
      'artist': 'TPE1',
      'album': 'TALB',
      'year': 'TYER',
      'comment': 'COMM',
      'track': 'TRCK',
      'genre': 'TCON',
    };

    // First clear tags that are removed by user (not in updatedTags but were in original)
    const providedTags = new Set(updatedTags.map(t => t.tag.toUpperCase()));
    for (const key of Object.keys(mp3tag.tags.v2)) {
      if (!providedTags.has(key.toUpperCase())) {
        delete (mp3tag.tags.v2 as any)[key];
      }
    }

    for (const tag of updatedTags) {
      let frameId = tag.tag.toUpperCase();
      // If user typed a friendly name like 'title', map it
      if (aliasToFrame[tag.tag.toLowerCase()]) {
        frameId = aliasToFrame[tag.tag.toLowerCase()];
      }
      
      (mp3tag.tags.v2 as any)[frameId] = tag.value;
    }
  }

  mp3tag.save();

  if (mp3tag.error !== '') {
    throw new Error(`Failed to save audio metadata: ${mp3tag.error}`);
  }

  const blob = new Blob([mp3tag.buffer], { type: file.type || "audio/mpeg" });
  return { url: URL.createObjectURL(blob), warnings: [] };
}

async function writeExiftoolAudioMetadata(file: File, updatedTags: ExifTag[], scrubAll: boolean): Promise<{ url: string, warnings: string[] }> {
  let tagsToApply: Record<string, string> = {};

  if (scrubAll) {
    tagsToApply = { "all": "" };
  } else {
    for (const tag of updatedTags) {
      tagsToApply[tag.tag] = tag.value;
    }
  }

  let currentTags = { ...tagsToApply };
  let result: any;
  let attempts = 0;
  let undefinedTags: string[] = [];

  while (attempts < 5) {
    result = await exiftoolWrite(file, currentTags, {
      args: ["-m"],
      fetch: (url: any, init: any) => {
        if (url.toString().endsWith('.wasm')) {
          return fetch('/zeroperl.wasm', init);
        }
        return fetch(url, init);
      }
    });

    if (!result.success && result.error) {
      const lines = result.error.split('\n');
      let removedAny = false;
      for (const line of lines) {
        let match = line.match(/Warning: Tag '(.*?)' is not defined/i);
        if (!match) match = line.match(/Warning: Sorry, (.*?) is not writable/i);
        if (!match) match = line.match(/Warning: Can't delete (.*?)$/i);
        if (!match) match = line.match(/for \w+:(.*?)$/i);

        if (match && match[1]) {
          const tagName = match[1];
          if (currentTags[tagName] !== undefined) {
            delete currentTags[tagName];
            undefinedTags.push(tagName);
            removedAny = true;
          } else {
            const key = Object.keys(currentTags).find(k => k.toLowerCase() === tagName.toLowerCase());
            if (key) {
              delete currentTags[key];
              undefinedTags.push(key);
              removedAny = true;
            }
          }
        }
      }
      
      if (removedAny) {
        if (Object.keys(currentTags).length === 0) {
          result = { success: true, data: await file.arrayBuffer() };
          break;
        }
        attempts++;
        continue;
      }
    }
    break;
  }

  if (!result || !result.success) {
    if (undefinedTags.length > 0) {
      throw new Error(`Failed to process audio metadata: ${result?.error}. (Also could not modify: ${undefinedTags.join(", ")})`);
    }
    throw new Error(`Failed to process audio metadata: ${result?.error}`);
  }

  const blob = new Blob([result.data], { type: file.type || "application/octet-stream" });
  return { 
    url: URL.createObjectURL(blob), 
    warnings: undefinedTags.length > 0 ? [`Ignored custom tags (use Scrub to remove): ${undefinedTags.join(", ")}`] : [] 
  };
}

async function writeFlacMetadata(file: File, updatedTags: ExifTag[], scrubAll: boolean): Promise<{ url: string, warnings: string[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const flac = new Metaflac(buffer);
  
  flac.removeAllTags();
  
  if (!scrubAll) {
    for (const tag of updatedTags) {
      if (tag.tag && tag.value) {
        try {
          flac.setTag(`${tag.tag}=${tag.value}`);
        } catch (e) {
          // Ignore invalid tags
        }
      }
    }
  }
  
  const savedBuffer = flac.save();
  const blob = new Blob([savedBuffer], { type: file.type || "audio/flac" });
  return { url: URL.createObjectURL(blob), warnings: [] };
}
