import { parseMetadata as exiftoolParse, writeMetadata as exiftoolWrite } from "@uswriting/exiftool";
import { ExifTag, MetadataInfo } from "../../components/MetadataView";
import { isReadOnlyTag } from "./common";

export async function parseImageMetadata(file: File): Promise<MetadataInfo> {
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
    throw new Error(`Failed to parse image metadata: ${result.error}`);
  }

  const exifData = Array.isArray(result.data) ? result.data[0] : result.data;
  const tags: ExifTag[] = [];

  if (exifData) {
    for (const [key, value] of Object.entries(exifData)) {
      // Ignore sourcefile, directory, filename since they are system paths or repetitive
      const ignoredTags = [
        'SourceFile', 'Directory', 'FileName', 'FilePermissions', 'ExifToolVersion',
        'FileSize', 'FileModifyDate', 'FileAccessDate', 'FileInodeChangeDate',
        'FileType', 'FileTypeExtension', 'MIMEType', 'Error', 'Warning'
      ];
      if (ignoredTags.includes(key)) continue;
      
      // Ignore massive binary buffers
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

  return {
    file_name: file.name,
    file_size_bytes: file.size,
    mime_type: file.type || "image/jpeg",
    exif_tags: uniqueTags,
  };
}

export async function writeImageMetadata(file: File, updatedTags: ExifTag[], scrubAll: boolean): Promise<{ url: string, warnings: string[] }> {
  let tagsToApply: Record<string, string> = {};

  if (scrubAll) {
    // ExifTool equivalent of -all=
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
            // Sometimes it errors about a tag that was indirectly modified or it's named slightly differently
            // We can try to find a case-insensitive match
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
      throw new Error(`Failed to process image metadata: ${result?.error}. (Also could not modify: ${undefinedTags.join(", ")})`);
    }
    throw new Error(`Failed to process image metadata: ${result?.error}`);
  }

  const blob = new Blob([result.data], { type: file.type || "application/octet-stream" });
  return { 
    url: URL.createObjectURL(blob), 
    warnings: undefinedTags.length > 0 ? [`Ignored custom tags (use Scrub to remove): ${undefinedTags.join(", ")}`] : [] 
  };
}
