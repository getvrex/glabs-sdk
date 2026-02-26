/**
 * CLI Output — formatters for JSON, file saving, progress display.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

/** Print JSON to stdout */
export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/** Print a key-value table to stderr */
export function printTable(rows: [string, string][]): void {
  const maxKey = Math.max(...rows.map(([k]) => k.length));
  for (const [key, value] of rows) {
    console.log(`  ${key.padEnd(maxKey)}  ${value}`);
  }
}

/** Print error and exit */
export function fatal(message: string, code = 1): never {
  console.error(`error: ${message}`);
  process.exit(code);
}

/** Ensure output directory exists, return resolved path */
function ensureDir(dir: string): string {
  const resolved = resolve(dir);
  mkdirSync(resolved, { recursive: true });
  return resolved;
}

/** Save base64 image to file, returns the file path */
export function saveImage(
  base64: string,
  outputDir: string,
  prefix = "image",
  ext = "png"
): string {
  const dir = ensureDir(outputDir);
  const name = `${prefix}-${Date.now()}.${ext}`;
  const filePath = join(dir, name);
  writeFileSync(filePath, Buffer.from(base64, "base64"));
  return filePath;
}

/** Download a URL to a file, returns the file path */
export async function downloadFile(
  url: string,
  outputDir: string,
  prefix = "video",
  ext = "mp4"
): Promise<string> {
  const dir = ensureDir(outputDir);
  const name = `${prefix}-${Date.now()}.${ext}`;
  const filePath = join(dir, name);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(filePath, buf);
  return filePath;
}

/** Write in-place progress line (carriage return) */
export function progressLine(text: string): void {
  if (process.stderr.isTTY) {
    process.stderr.write(`\r${text}`);
  }
}

/** Clear the progress line */
export function clearProgress(): void {
  if (process.stderr.isTTY) {
    process.stderr.write("\r\x1b[K");
  }
}
