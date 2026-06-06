import { ExifTag, MetadataInfo } from "../components/MetadataView";

export async function parseMetadata(file: File): Promise<MetadataInfo> {
  const name = file.name.toLowerCase();

  // 1. Plaintext Formats (TXT, CSV) - Unsupported
  if (name.endsWith('.txt') || name.endsWith('.csv')) {
    throw new Error(`${file.name} is a plaintext format and does not contain embedded metadata.`);
  }

  // 2. Documents (PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, RTF)
  if (
    file.type === 'application/pdf' || 
    name.endsWith('.pdf') || 
    name.endsWith('.docx') || 
    name.endsWith('.xlsx') || 
    name.endsWith('.pptx') ||
    name.endsWith('.doc') || 
    name.endsWith('.xls') || 
    name.endsWith('.ppt') ||
    name.endsWith('.rtf')
  ) {
    const { parseDocumentMetadata } = await import("./parsers/documentParser");
    return parseDocumentMetadata(file);
  }

  // 3. Audio (FLAC, MP3, WAV, M4A, AAC, etc.)
  if (
    file.type.startsWith('audio/') || 
    name.endsWith('.mp3') || 
    name.endsWith('.m4a') || 
    name.endsWith('.aac') ||
    name.endsWith('.flac') ||
    name.endsWith('.wav')
  ) {
    const { parseAudioMetadata } = await import("./parsers/audioParser");
    return parseAudioMetadata(file);
  }

  // 4. Video (MP4, MOV, AVI, MKV, WebM)
  if (
    file.type.startsWith('video/') ||
    name.endsWith('.mp4') ||
    name.endsWith('.mov') ||
    name.endsWith('.avi') ||
    name.endsWith('.mkv') ||
    name.endsWith('.webm')
  ) {
    const { parseVideoMetadata } = await import("./parsers/videoParser");
    return parseVideoMetadata(file);
  }

  // 5. Photos & Images (JPEG/JPG, PNG, GIF, TIFF, RAW, SVG, WebP)
  // Default fallback is imageParser
  const { parseImageMetadata } = await import("./parsers/imageParser");
  return parseImageMetadata(file);
}

export async function writeMetadata(file: File, updatedTags: ExifTag[], scrubAll: boolean = false): Promise<{ url: string, warnings: string[] }> {
  const name = file.name.toLowerCase();

  // 1. Plaintext Formats (TXT, CSV) - Unsupported
  if (name.endsWith('.txt') || name.endsWith('.csv')) {
    throw new Error(`${file.name} is a plaintext format and does not contain embedded metadata.`);
  }

  // 2. Documents (PDF, DOCX, XLSX, PPTX, DOC, XLS, PPT, RTF)
  if (
    file.type === 'application/pdf' || 
    name.endsWith('.pdf') || 
    name.endsWith('.docx') || 
    name.endsWith('.xlsx') || 
    name.endsWith('.pptx') ||
    name.endsWith('.doc') || 
    name.endsWith('.xls') || 
    name.endsWith('.ppt') ||
    name.endsWith('.rtf')
  ) {
    const { writeDocumentMetadata } = await import("./parsers/documentParser");
    return writeDocumentMetadata(file, updatedTags, scrubAll);
  }

  // 3. Audio (FLAC, MP3, WAV, M4A, AAC, etc.)
  if (
    file.type.startsWith('audio/') || 
    name.endsWith('.mp3') || 
    name.endsWith('.m4a') || 
    name.endsWith('.aac') ||
    name.endsWith('.flac') ||
    name.endsWith('.wav')
  ) {
    const { writeAudioMetadata } = await import("./parsers/audioParser");
    return writeAudioMetadata(file, updatedTags, scrubAll);
  }

  // 4. Video (MP4, MOV, AVI, MKV, WebM)
  if (
    file.type.startsWith('video/') ||
    name.endsWith('.mp4') ||
    name.endsWith('.mov') ||
    name.endsWith('.avi') ||
    name.endsWith('.mkv') ||
    name.endsWith('.webm')
  ) {
    const { writeVideoMetadata } = await import("./parsers/videoParser");
    return writeVideoMetadata(file, updatedTags, scrubAll);
  }

  // 5. Photos & Images (JPEG/JPG, PNG, GIF, TIFF, RAW, SVG, WebP)
  const { writeImageMetadata } = await import("./parsers/imageParser");
  return writeImageMetadata(file, updatedTags, scrubAll);
}
