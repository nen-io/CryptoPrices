import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Production is canonical. No downloads, design-study reads, or generated runtime code.
const project = path.resolve(import.meta.dirname, '..');
const directory = path.join(project, 'src/renderer/history');
const publicDirectory = path.join(project, 'src/renderer/public');
const records = JSON.parse(fs.readFileSync(path.join(directory, 'slides.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'asset-manifest.json'), 'utf8'));
const sourceHosts = new Set(['clevelandart.org', 'www.metmuseum.org', 'www.nga.gov', 'open.smk.dk']);
const rightsHosts = new Set(['creativecommons.org', 'www.clevelandart.org', 'www.metmuseum.org']);
const ids = new Set(), sources = new Set(), hashes = new Set(), assets = new Set();
let totalBytes = 0;
function jpegDimensions(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Expected JPEG image');
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset++] !== 0xff) throw new Error('Invalid JPEG marker');
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) throw new Error('Invalid JPEG segment');
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    }
    offset += length;
  }
  throw new Error('JPEG dimensions unavailable');
}
function verifyUrl(value, hosts) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !hosts.has(url.hostname) || url.port || url.username || url.password || url.hash) {
    throw new Error(`Unapproved citation: ${value}`);
  }
}
if (!Array.isArray(records) || records.length !== 60 || !Array.isArray(manifest) || manifest.length !== 60) {
  throw new Error('Expected 60 records and 60 asset manifest entries');
}
for (const [position, record] of records.entries()) {
  for (const field of ['id', 'title', 'creator', 'date', 'era', 'medium', 'museum', 'accession', 'image', 'sourceUrl', 'rights', 'rightsUrl', 'caption']) {
    if (typeof record[field] !== 'string' || !record[field].trim()) throw new Error(`Missing ${field}: ${record.id}`);
  }
  if (!Number.isInteger(record.sortYear) || (position && record.sortYear < records[position - 1].sortYear)) throw new Error(`Invalid chronological order: ${record.id}`);
  if (record.sourceNote !== undefined && typeof record.sourceNote !== 'string') throw new Error(`Invalid source note: ${record.id}`);
  const source = record.sourceUrl.replace('://www.', '://').replace(/\/$/, '');
  if (ids.has(record.id) || sources.has(source)) throw new Error(`Duplicate object: ${record.id}`);
  ids.add(record.id); sources.add(source);
  if (!['CC0', 'Public domain'].includes(record.rights)) throw new Error(`Unverified reuse label: ${record.id}`);
  verifyUrl(record.sourceUrl, sourceHosts); verifyUrl(record.rightsUrl, rightsHosts);
  if (!/^history\/images\/[a-z0-9-]+\.jpg$/.test(record.image)) throw new Error(`Unexpected image path: ${record.id}`);
  const file = path.join(publicDirectory, record.image);
  const bytes = fs.readFileSync(file);
  const hash = createHash('sha256').update(bytes).digest('hex');
  const asset = manifest.find(item => item.id === record.id);
  if (!asset || asset.image !== record.image || asset.bytes !== bytes.length || asset.sha256 !== hash) throw new Error(`Asset manifest mismatch: ${record.id}`);
  if (hashes.has(hash) || assets.has(record.image)) throw new Error(`Repeated image: ${record.id}`);
  const { width, height } = jpegDimensions(bytes);
  if (width < 100 || height < 100 || width > 1200 || height > 1200 || bytes.length > 1_500_000) throw new Error(`Image exceeds gallery limits: ${record.id} (${width}×${height})`);
  hashes.add(hash); assets.add(record.image); totalBytes += bytes.length;
}
for (const name of fs.readdirSync(path.join(publicDirectory, 'history/images'))) {
  if (!assets.has(`history/images/${name}`)) throw new Error(`Unreferenced packaged image: ${name}`);
}
console.log(`Verified ${records.length} distinct production artworks, local JPEGs ≤1200px, SHA-256 manifest and approved source links (${(totalBytes / 1_000_000).toFixed(2)} MB).`);
