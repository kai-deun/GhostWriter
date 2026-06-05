import { readFileSync, writeFileSync } from 'fs';
import { parseMetadata } from '@uswriting/exiftool';

async function test() {
  const buf = Buffer.from("UEsDBBQAAAAIAAAAIQAAAAAAAAAAAAA=", "base64"); // Fake ZIP header for DOCX
  const file = { name: 'test.docx', data: new Uint8Array(buf) };
  
  const res = await parseMetadata(file, { args: ["-json"] });
  console.log("DOCX:", res);
}
test();
