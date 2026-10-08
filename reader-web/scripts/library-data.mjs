import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const appRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const projectRoot = path.resolve(appRoot, '..');
const booksRoot = path.join(projectRoot, 'books');
const antifragileUnits = new Map([
  ['map', [-2, '原书导航地图']], ['prologue', [-1, '前言']], ['triad', [0, '三元组']],
  ['book_i', [0.5, '第一卷引言']], ['book_ii', [4.5, '第二卷引言']],
  ['book_iii', [8.5, '第三卷引言']], ['book_iv', [11.5, '第四卷引言']],
  ['book_v', [17.5, '第五卷引言']], ['book_vi', [19.5, '第六卷引言']],
  ['book_vii', [22.5, '第七卷引言']], ['epilogue', [25.5, '后记']],
  ['glossary', [26, '术语表']], ['appendix_1', [27, '附录一']],
  ['appendix_2', [28, '附录二']], ['notes', [29, '附加注释']],
  ['bibliography', [30, '参考文献']], ['acknowledgments', [31, '致谢']],
  ['other_books', [32, '作者其他著作']], ['about_author', [33, '作者简介']],
]);
const thinkingUnits = new Map([
  ['introduction', [0, '引言']], ['part_i', [0.5, '第一部分引言']],
  ['part_ii', [9.5, '第二部分引言']], ['part_iii', [18.5, '第三部分引言']],
  ['part_iv', [24.5, '第四部分引言']], ['part_v', [34.5, '第五部分引言']],
  ['conclusions', [38.5, '结语']],
]);

async function directories(parent) {
  return (await readdir(parent, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function variantFor(file) {
  const raw = file.replace(/^\d+_/, '').replace(/\.md$/i, '');
  if (raw === '伴读') return { key: 'companion', label: '伴读', preferred: true };
  if (raw === '原文版') return { key: 'original', label: '原文版', preferred: false };
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
    const maoArticles = book === '毛泽东选集'
      ? JSON.parse(await readFile(path.join(booksRoot, book, '目录.json'), 'utf8')) : [];
    const maoById = new Map(maoArticles.map((item) => [item.chapterId, item]));
    const chaptersRoot = path.join(booksRoot, book, 'chapters');
    for (const chapterId of await directories(chaptersRoot)) {
      const extra = book === '反脆弱' ? antifragileUnits.get(chapterId)
        : book === '思考，快与慢' ? thinkingUnits.get(chapterId) : undefined;
      if (!/^ch\d+$/i.test(chapterId) && !extra && !(book === '毛泽东选集' && /^a\d+$/i.test(chapterId))) continue;
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
        const number = extra ? Math.max(0, Math.floor(extra[0])) : Number(chapterId.replace(/\D/g, ''));
        const content = mergeBatches(variant.parts);
        const maoArticle = maoById.get(chapterId);
        documents.push({
          id: `${book}/${chapterId}/${variant.key}`,
          book,
          chapterId,
          chapterNumber: maoArticle?.number ?? number,
          sortOrder: maoArticle?.number ?? (extra ? extra[0] : number),
          chapterTitle: maoArticle ? `卷${maoArticle.volume} · ${maoArticle.title}` : extra ? extra[1] : book === '聪明的投资者' && number === 0 ? '序言与导论' : `第 ${number} ${book === '人生财富靠康波' ? '篇' : '章'}`,
          group: maoArticle?.group ?? null,
          title: content.match(/^#\s+(.+)$/m)?.[1]?.trim() || `${book} · 第 ${number} 章`,
          variant: variant.label,
          preferred: variant.preferred,
          batchCount: variant.parts.length,
          locked: false,
          content,
        });
      }
    }
    if (book === '毛泽东选集') {
      for (const article of maoArticles.filter((item) => !item.selected)) {
        documents.push({
          id: `${book}/${article.chapterId}/locked`, book, chapterId: article.chapterId,
          chapterNumber: article.number, sortOrder: article.number,
          chapterTitle: `卷${article.volume} · ${article.title}`, title: article.title,
          group: article.group ?? null,
          variant: '待伴读', preferred: false, batchCount: 0, locked: true, content: '',
        });
      }
    }
  }
  documents.sort(
    (a, b) =>
      a.book.localeCompare(b.book, 'zh-CN') ||
      a.sortOrder - b.sortOrder ||
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

