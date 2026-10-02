import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const appRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const projectRoot = path.resolve(appRoot, '..');
const booksRoot = path.join(projectRoot, 'books');

async function directories(parent) {
  return (await readdir(parent, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function variantFor(file) {
  const raw = file.replace(/^\d+_/, '').replace(/\.md$/i, '');
  if (/忠实|直译/.test(raw)) return { key: 'faithful', label: '忠实核对版', preferred: false };
  if (/易读|顺译|意译/.test(raw)) return { key: 'readable', label: '中文语境易读版', preferred: true };
  return { key: raw, label: raw, preferred: false };
}

function mergeBatches(parts) {
  return parts
    .map(({ content }, index) => {
      if (index === 0) return content.trim();
      return content.replace(/^#\s+.+\r?\n+/, '').trim();
    })
    .join('\n\n---\n\n') + '\n';
}

export async function collectLibrary() {
  const documents = [];
  for (const book of await directories(booksRoot)) {
    const chaptersRoot = path.join(booksRoot, book, 'chapters');
    for (const chapterId of await directories(chaptersRoot)) {
      if (!/^ch\d+$/i.test(chapterId)) continue;
      const chapterRoot = path.join(chaptersRoot, chapterId);
      const files = (await readdir(chapterRoot))
        .filter((name) => /^\d+_.+\.md$/i.test(name))
        .sort((a, b) => a.localeCompare(b, 'zh-CN'));
      const variants = new Map();
      for (const file of files) {
        const variant = variantFor(file);
        const content = await readFile(path.join(chapterRoot, file), 'utf8');
        const parts = variants.get(variant.key) ?? { ...variant, parts: [] };
        parts.parts.push({ file, content });
        variants.set(variant.key, parts);
      }
      for (const variant of variants.values()) {
        const number = Number(chapterId.replace(/\D/g, ''));
        const content = mergeBatches(variant.parts);
        documents.push({
          id: `${book}/${chapterId}/${variant.key}`,
          book,
          chapterId,
          chapterNumber: number,
          chapterTitle: `第 ${number} 章`,
          title: content.match(/^#\s+(.+)$/m)?.[1]?.trim() || `${book} · 第 ${number} 章`,
          variant: variant.label,
          preferred: variant.preferred,
          batchCount: variant.parts.length,
          content,
        });
      }
    }
  }
  documents.sort(
    (a, b) =>
      a.book.localeCompare(b.book, 'zh-CN') ||
      a.chapterNumber - b.chapterNumber ||
      Number(b.preferred) - Number(a.preferred) ||
      a.id.localeCompare(b.id, 'zh-CN'),
  );
  return documents;
}

export async function writeOfflineLibrary(documents) {
  const dataRoot = path.join(projectRoot, 'reader-data');
  const outputPath = path.join(dataRoot, 'library.js');
  await mkdir(dataRoot, { recursive: true });
  const json = JSON.stringify(documents, null, 2).replaceAll('<', '\\u003c');
  await writeFile(outputPath, `globalThis.__READER_LIBRARY__ = ${json};\n`, 'utf8');
  return outputPath;
}

