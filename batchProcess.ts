import fs from 'fs';
import path from 'path';
import { parseMetadata, writeMetadata } from './src/utils/metadataParser';

// Polyfill for Node.js environment
global.File = class File {
  name: string;
  type: string;
  buffer: Buffer;
  size: number;
  lastModified: number;

  constructor(bits: any[], name: string, options?: any) {
    this.name = name;
    this.type = options?.type || '';
    this.buffer = Buffer.from(bits[0]);
    this.size = this.buffer.byteLength;
    this.lastModified = Date.now();
  }

  async arrayBuffer() {
    return this.buffer.buffer.slice(this.buffer.byteOffset, this.buffer.byteOffset + this.buffer.byteLength);
  }
} as any;

global.Blob = class Blob {
  buffer: Buffer;
  type: string;
  constructor(bits: any[], options?: any) {
    this.buffer = Buffer.from(bits[0]);
    this.type = options?.type || '';
  }
  async arrayBuffer() {
    return this.buffer.buffer.slice(this.buffer.byteOffset, this.buffer.byteOffset + this.buffer.byteLength);
  }
} as any;

const blobMap = new Map<string, any>();

global.URL.createObjectURL = (blob: any) => {
  const id = 'blob:' + Math.random().toString(36).substring(2);
  blobMap.set(id, blob);
  return id;
};
global.URL.revokeObjectURL = (id: string) => {
  blobMap.delete(id);
};

const TESTING_DIR = path.join(process.cwd(), 'testing');
const RESULTS_DIR = path.join(process.cwd(), 'Results');
const EDITED_DIR = path.join(RESULTS_DIR, 'edited');
const SCRUBBED_DIR = path.join(RESULTS_DIR, 'scrubbed');

const getTypeFromExt = (ext: string) => {
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mp3',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.m4a': 'audio/m4a',
    '.aac': 'audio/aac',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.tiff': 'image/tiff',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
};

async function processFiles() {
  if (!fs.existsSync(EDITED_DIR)) fs.mkdirSync(EDITED_DIR, { recursive: true });
  if (!fs.existsSync(SCRUBBED_DIR)) fs.mkdirSync(SCRUBBED_DIR, { recursive: true });

  const files = fs.readdirSync(TESTING_DIR);

  for (const file of files) {
    console.log(`\n==============================================`);
    console.log(`Processing: ${file}`);
    const filePath = path.join(TESTING_DIR, file);
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(file);
    
    const fileObj = new File([fileBuffer], file, { type: getTypeFromExt(ext) });

    try {
      // 1. Edit (Add dummy tag)
      console.log(`Editing metadata...`);
      try {
        const editedResult = await writeMetadata(fileObj as any, [{ id: 'Author', name: 'Author', value: 'GhostWriter Test' }]);
        const blob = blobMap.get(editedResult.url);
        if (blob) {
            fs.writeFileSync(path.join(EDITED_DIR, file), blob.buffer);
            console.log(`[OK] Saved edited file to Results/edited/${file}`);
        } else {
            console.log(`[SKIP] Output is not a local blob.`);
        }
      } catch (err: any) {
        console.log(`[SKIP] Editing failed or not supported: ${err.message}`);
      }

      // 2. Scrub
      console.log(`Scrubbing metadata...`);
      try {
        const scrubbedResult = await writeMetadata(fileObj as any, [], true);
        const blob = blobMap.get(scrubbedResult.url);
        if (blob) {
            fs.writeFileSync(path.join(SCRUBBED_DIR, file), blob.buffer);
            console.log(`[OK] Saved scrubbed file to Results/scrubbed/${file}`);
        } else {
            console.log(`[SKIP] Output is not a local blob.`);
        }
      } catch (err: any) {
        console.log(`[SKIP] Scrubbing failed or not supported: ${err.message}`);
      }

    } catch (err: any) {
      console.error(`[ERROR] Failed to process ${file}:`, err.message);
    }
  }
}

processFiles().then(() => console.log('\nBatch processing complete!'));
