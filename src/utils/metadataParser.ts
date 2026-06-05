import { parseMetadata as exiftoolParse, writeMetadata as exiftoolWrite } from "@uswriting/exiftool";
import { PDFDocument } from "pdf-lib";
import { ExifTag, MetadataInfo } from "../components/MetadataView";

async function parsePdfMetadata(file: File): Promise<MetadataInfo> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { updateMetadata: false });
  
  const tags: ExifTag[] = [];
  
  const addTag = (tag: string, value: string | undefined) => {
    if (value) {
      tags.push({ tag, description: tag, value });
    }
  };

  addTag('Title', pdfDoc.getTitle());
  addTag('Author', pdfDoc.getAuthor());
  addTag('Subject', pdfDoc.getSubject());
  addTag('Keywords', pdfDoc.getKeywords());
  addTag('Creator', pdfDoc.getCreator());
  addTag('Producer', pdfDoc.getProducer());
  
  const creationDate = pdfDoc.getCreationDate();
  if (creationDate) addTag('CreationDate', creationDate.toISOString());
  
  const modDate = pdfDoc.getModificationDate();
  if (modDate) addTag('ModificationDate', modDate.toISOString());

  return {
    file_name: file.name,
    file_size_bytes: file.size,
    mime_type: file.type || "application/pdf",
    exif_tags: tags,
  };
}

async function writePdfMetadata(file: File, updatedTags: ExifTag[], scrubAll: boolean): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  if (scrubAll) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setCreator('');
    pdfDoc.setProducer('');
  } else {
    // pdf-lib does not support deleting tags easily if they are not explicitly set to empty strings.
    // We will just map the updated tags. Note that if a user deletes a tag, its value is "" in updatedTags.
    for (const tag of updatedTags) {
      const val = tag.value;
      switch (tag.tag) {
        case 'Title': pdfDoc.setTitle(val); break;
        case 'Author': pdfDoc.setAuthor(val); break;
        case 'Subject': pdfDoc.setSubject(val); break;
        case 'Keywords': pdfDoc.setKeywords(val.split(';').map(k => k.trim()).filter(Boolean)); break;
        case 'Creator': pdfDoc.setCreator(val); break;
        case 'Producer': pdfDoc.setProducer(val); break;
        case 'CreationDate': 
          if (val) {
            try { pdfDoc.setCreationDate(new Date(val)); } catch {}
          }
          break;
        case 'ModificationDate':
          if (val) {
            try { pdfDoc.setModificationDate(new Date(val)); } catch {}
          }
          break;
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}

export async function parseMetadata(file: File): Promise<MetadataInfo> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return parsePdfMetadata(file);
  }

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
    throw new Error(`Failed to parse metadata: ${result.error}`);
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
    mime_type: file.type || "application/octet-stream",
    exif_tags: uniqueTags,
  };
}

export async function writeMetadata(file: File, updatedTags: ExifTag[], scrubAll: boolean = false): Promise<string> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return writePdfMetadata(file, updatedTags, scrubAll);
  }

  let tagsToApply: Record<string, string> = {};

  if (scrubAll) {
    // ExifTool equivalent of -all=
    tagsToApply = { "all": "" };
  } else {
    for (const tag of updatedTags) {
      tagsToApply[tag.tag] = tag.value;
    }
  }

  const result = await exiftoolWrite(file, tagsToApply, {
    args: ["-m"],
    fetch: (url: any, init: any) => {
      if (url.toString().endsWith('.wasm')) {
        return fetch('/zeroperl.wasm', init);
      }
      return fetch(url, init);
    }
  });

  if (!result.success) {
    throw new Error(`Failed to process metadata: ${result.error}`);
  }

  const blob = new Blob([result.data], { type: file.type || "application/octet-stream" });
  return URL.createObjectURL(blob);
}
