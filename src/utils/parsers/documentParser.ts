import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { parseMetadata as exiftoolParse } from "@uswriting/exiftool";
import { ExifTag, MetadataInfo } from "../../components/MetadataView";

export async function parseDocumentMetadata(file: File): Promise<MetadataInfo> {
  const name = file.name.toLowerCase();

  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    return parsePdfMetadata(file);
  }

  if (name.endsWith('.docx') || name.endsWith('.xlsx') || name.endsWith('.pptx')) {
    return parseOfficeMetadata(file);
  }

  if (name.endsWith('.doc') || name.endsWith('.xls') || name.endsWith('.ppt') || name.endsWith('.rtf')) {
    return parseLegacyDocumentMetadata(file);
  }

  throw new Error(`Unsupported document type: ${file.name}`);
}

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

async function parseOfficeMetadata(file: File): Promise<MetadataInfo> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = new JSZip();
  await zip.loadAsync(arrayBuffer);
  
  const tags: ExifTag[] = [];
  const coreXmlFile = zip.file("docProps/core.xml");
  if (coreXmlFile) {
    const coreXml = await coreXmlFile.async("string");
    const matches = coreXml.match(/<cp:(coreProperties)[^>]*>(.*?)<\/cp:\1>/is);
    if (matches && matches[2]) {
      const content = matches[2];
      const propRegex = /<([a-zA-Z0-9:]+)[^>]*>(.*?)<\/\1>/gs;
      let propMatch;
      while ((propMatch = propRegex.exec(content)) !== null) {
        const fullTag = propMatch[1];
        const value = propMatch[2];
        if (value) {
           const tag = fullTag.replace('dc:', '').replace('cp:', '');
           tags.push({ tag, description: tag, value });
        }
      }
    }
  }

  return {
    file_name: file.name,
    file_size_bytes: file.size,
    mime_type: file.type || "application/octet-stream",
    exif_tags: tags,
  };
}

async function parseLegacyDocumentMetadata(file: File): Promise<MetadataInfo> {
  const tags: ExifTag[] = [];
  try {
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

    if (result.success && result.data) {
      const exifData = Array.isArray(result.data) ? result.data[0] : result.data;
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
          });
        }
      }
    }
  } catch (err) {
    console.warn("Graceful fallback for legacy doc parser failure:", err);
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

export async function writeDocumentMetadata(file: File, updatedTags: ExifTag[], scrubAll: boolean): Promise<{ url: string, warnings: string[] }> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.doc') || name.endsWith('.xls') || name.endsWith('.ppt') || name.endsWith('.rtf')) {
    throw new Error(`${file.name} is a legacy binary Office/RTF format, which has write restrictions in a browser-only environment. Writing or stripping metadata for these formats is read-only here. Please convert this file to a modern format (.docx, .xlsx, or .pptx) to edit or remove its metadata.`);
  }

  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    return writePdfMetadata(file, updatedTags, scrubAll);
  }

  if (name.endsWith('.docx') || name.endsWith('.xlsx') || name.endsWith('.pptx')) {
    return writeOfficeMetadata(file, updatedTags, scrubAll);
  }

  throw new Error(`Unsupported document type: ${file.name}`);
}

async function writePdfMetadata(file: File, updatedTags: ExifTag[], scrubAll: boolean): Promise<{ url: string, warnings: string[] }> {
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
  return { url: URL.createObjectURL(blob), warnings: [] };
}

async function writeOfficeMetadata(file: File, updatedTags: ExifTag[], scrubAll: boolean): Promise<{ url: string, warnings: string[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = new JSZip();
  await zip.loadAsync(arrayBuffer);
  
  const coreXmlFile = zip.file("docProps/core.xml");
  if (coreXmlFile) {
    let coreXml = await coreXmlFile.async("string");
    
    if (scrubAll) {
      const fieldsToClear = ['dc:creator', 'dc:title', 'dc:subject', 'dc:description', 'cp:keywords', 'cp:lastModifiedBy'];
      for (const field of fieldsToClear) {
        const regex = new RegExp(`(<${field}>).*?(<\/${field}>)`, 'is');
        coreXml = coreXml.replace(regex, `$1$2`);
      }
    } else {
      for (const tag of updatedTags) {
        const tagName = tag.tag;
        let xmlTag = `cp:${tagName}`;
        if (['title', 'creator', 'subject', 'description'].includes(tagName.toLowerCase())) {
           xmlTag = `dc:${tagName.toLowerCase()}`;
        }
        
        const tagRegex = new RegExp(`(<${xmlTag}[^>]*>).*?(<\/${xmlTag}>)`, 'is');
        if (tagRegex.test(coreXml)) {
           coreXml = coreXml.replace(tagRegex, `$1${tag.value}$2`);
        } else {
           coreXml = coreXml.replace('</cp:coreProperties>', `<${xmlTag}>${tag.value}</${xmlTag}></cp:coreProperties>`);
        }
      }
    }
    zip.file("docProps/core.xml", coreXml);
  }
  
  const newBuffer = await zip.generateAsync({ type: "uint8array" });
  const blob = new Blob([newBuffer], { type: file.type || "application/octet-stream" });
  return { url: URL.createObjectURL(blob), warnings: [] };
}
