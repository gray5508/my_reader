import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
const systematicUnits = new Map([
  ['preface', [-1, '前言']], ['introduction', [0, '引言']],
  ['epilogue', [15.5, '后记']], ['appendix_a', [16, '附录 A']],
]);
const zhishiUnits = new Map([
  ['foreword', [0, '前言']], ['part_i', [0.5, '上篇导言']],
  ['part_ii', [4.5, '下篇导言']], ['epilogue', [8.5, '结束语']],
  ['bibliography', [9, '参考文献']],
]);
const zhishiTitles = [
  '地方政府的权力与事务', '财税与政府行为', '政府投融资与债务', '工业化中的政府角色',
  '城市化与不平衡', '债务与风险', '国内国际失衡', '总结：政府与经济发展',
];

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

export function readerContent(raw, variant) {
  const lines = raw.split(/\r?\n/);
  let index = 1;
  while (lines[index] === '') index++;

  if (lines[index] === '## 来源与覆盖') {
    let end = index + 1;
    while (lines[end] === '') end++;
    while (end < lines.length && lines[end] !== '' && !/^#{2,6}\s/.test(lines[end])) end++;
    while (lines[end] === '') end++;
    if (lines[end] === '## 正文' || /^---+$/.test(lines[end] ?? '')) end++;
    lines.splice(index, end - index);
  } else if (/^- (?:主源|英文依据|英文原文|来源范围|来源|范围)：/.test(lines[index] ?? '')) {
    let end = index;
    while (lines[end]?.startsWith('- ')) end++;
    lines.splice(index, end - index);
    if (variant.key === 'original') lines.splice(index, 0, '阅读注｜按原书顺序转排；版式细节以 EPUB 为准。');
  } else if (lines[index] && !/^(?:#|[-*] |\d+\. )/.test(lines[index])) {
    let end = index;
    while (lines[end]?.trim()) end++;
    const intro = lines.slice(index, end).join(' ');
    if (/(?:EPUB|xhtml|html|split_|SHA-256|offset|提取流|正文块|本地块|Source:)/i.test(intro)) {
      let note = intro
        .replace(/^(?:本单元对应英文 EPUB|来源：英文 EPUB)\s*`[^`]+`[、，]\s*`[^`]+`。/, '本单元含两篇原书材料。')
        .replace(/(?:，|；)?\s*(?:位置为|位于|位置在|位置：|定位于)\s*(?:英文 )?EPUB\s*`[^`]+`/g, '')
        .replace(/自序在\s*`[^`]+`\s*，讲/g, '自序讲')
        .replace(/^Source:\s*[^\n]*?`[^`]+`[^.]*\.\s*/i, '')
        .replace(/`[^`]*(?:OPS\/|OEBPS\/|EPUB\/|xhtml|html|split_|#p\d|#ft_|#\d{4}|\.jpe?g|\.png|[a-f\d]{64})[^`]*`/gi, '')
        .replace(/(?:OPS|OEBPS|EPUB)\/[\w!./#-]+/g, '')
        .replace(/\b[\w!-]+\.(?:xhtml|html|jpe?g|png)(?:#[\w-]+)?/gi, '')
        .replace(/(?:正文|主内容|content|text)?\s*(?:块|blocks?)\s*\d+\s*[—–-]\s*\d+(?:\s*(?:块|blocks?))?/gi, '')
        .replace(/(?:，|；)?\s*(?:共\s*\d+\s*个非标题正文块|\d+\s*个文字块|(?:提取流|offset|本地(?:读取)?块|主内容块)[^，。；]*)/g, '')
        .replace(/(?:，|；)?\s*(?:EPUB )?抽取块(?:与 offset)?不是印刷页码/g, '')
        .replace(/^(?:原文|来源|原书定位)\s*[:：]\s*/i, '')
        .replace(/^(?:英文 EPUB|EPUB)\s*[、与及，；。\s]+/, '')
        .replace(/[，；]EPUB(?=[，；。])/g, '')
        .replace(/^(?:与|及)\s*。/, '')
        .replace(/^Source:\s*/i, '')
        .replace(/^原文定位：?\s*[。；，\s]*/, '')
        .replace(/^无独立原图、表格或本单元脚注。/, '')
        .replace(/同一\s*。/g, '同一 EPUB。')
        .replace(/[，；]\s*[，；。]/g, '。')
        .replace(/（\s*）|\(\s*\)/g, '')
        .replace(/\s+([，；。])/g, '$1')
        .replace(/^[，；。\s]+|[，；\s]+$/g, '');
      if (/^Source:/i.test(intro) && variant.key === 'original') {
        note = /Zweig/.test(intro) && /Graham/.test(intro)
          ? '格雷厄姆正文与 Zweig 后加评注分别阅读；书中的市场判断属于各自写作年代。'
          : /Zweig/.test(intro)
            ? 'Zweig 的评注按 2003 年写作语境阅读。'
            : /Graham/.test(intro)
              ? '格雷厄姆的论述按原写作年代阅读。'
              : '';
      }
      if (/^(?:原文范围|定位|范围|对应\s*`)/.test(note)) note = note.replace(/^[^。]*。\s*/, '');
      note = note
        .replace(/^这一页只有三个英文文字块，/, '')
        .replace(/核心提醒在\s+的\s+/g, '核心提醒是 ')
        .replace(/^标题后\s*\d+\s*个[^。]*?[，。]/, '')
        .replace(/^这一页只有\s*\d+\s*个英文文字块，/, '')
        .replace(/英文主源\s*SHA-256[^。]*。?/g, '')
        .replace(/(?:下一位置为|抽取流)[^。]*。?/g, '')
        .replace(/^(?:与同号易读版覆盖同一范围|注释\s*\d+[—–-]\d+\s*来自)[。\s]*/g, '')
        .replace(/^(?:本单元对应英文|英文 EPUB)\s*[、。]/, '')
        .replace(/^[，；。\s]+|[，；\s]+$/g, '');
      if (/^(?:本批|本范围|无图表|空白排版块|评注至此|格雷厄姆正文至此)/.test(note) && note.length < 28) note = '';
      if (note && !/^[。；，\s]+$/.test(note)) lines.splice(index, end - index, `阅读注｜${note}`);
      else lines.splice(index, end - index);
    }
  }
  return lines.filter((line) => !/^(?:## EPUB\s+`|<!--.*-->|Source:.*(?:xhtml|html|blocks?|OPS\/|OEBPS\/|EPUB\/)|翻译依据是.*SHA-256)/i.test(line)).join('\n')
    .replace(/^.*(?:下一源位置|下一位置)[:：].*(?:xhtml|offset).*\n?/gm, '')
    .replace(/`[^`\n]*(?:OEBPS\/|OPS\/|EPUB\/|part\d+\.xhtml|split_\d+)[^`\n]*`(?=\s*中)/g, '原书')
    .replace(/`[^`\n]*(?:OEBPS\/|OPS\/|EPUB\/|part\d+\.xhtml|split_\d+)[^`\n]*`/g, '')
    .replace(/(?:OEBPS|OPS|EPUB)\/[\w!./#-]+/g, '')
    .replace(/\bpart\d+\.xhtml\b/g, '')
    .replace(/The original source file is\s*\./g, '')
    .replace(/Source image:\s*;/g, '')
    .replace(/原文在\s*[；。]/g, '')
    .replace(/(?:下一位置|下一源位置)[，：]\s*offset\s*`?[\d–—-]+`?。?/g, '')
    .replace(/(?:\d+|[一二三四五六七八九十]+)\s*个(?:非标题)?(?:正文|文本|文字)块/g, '')
    .replace(/\d+\s*个有文字的正文块/g, '')
    .replace(/有标题及(?=[，、])/g, '有标题')
    .replace(/正文已按 EPUB 的\s*核对。?/g, '')
    .replace(/英文原文版已转排全部\s*。?/g, '')
    .replace(/本单元英文 EPUB\s*，/g, '')
    .replace(/本篇无图，(?=\n|$)/gm, '')
    .replace(/｜\s*：/g, '：')
    .replace(/原书\s+中/g, '原书中')
    .replace(/\s+([，；。：])/g, '$1')
    .replace(/（\s*）|\(\s*\)/g, '');
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
    const assetBookSlug = ['估值原理', '系统化交易', '置身事内'].includes(book) ? createHash('sha1').update(book).digest('hex') : null;
    const maoArticles = book === '毛泽东选集'
      ? JSON.parse(await readFile(path.join(booksRoot, book, '目录.json'), 'utf8')) : [];
    const maoById = new Map(maoArticles.map((item) => [item.chapterId, item]));
    const chaptersRoot = path.join(booksRoot, book, 'chapters');
    for (const chapterId of await directories(chaptersRoot)) {
      const extra = book === '反脆弱' ? antifragileUnits.get(chapterId)
        : book === '思考，快与慢' ? thinkingUnits.get(chapterId)
          : book === '系统化交易' ? systematicUnits.get(chapterId)
            : book === '置身事内' ? zhishiUnits.get(chapterId) : undefined;
      if (!/^ch\d+$/i.test(chapterId) && !extra && !(book === '毛泽东选集' && /^a\d+$/i.test(chapterId))) continue;
      const chapterRoot = path.join(chaptersRoot, chapterId);
      const valuationTitle = book === '估值原理' ? (chapterId === 'ch00' ? '全书索引' : (await readFile(path.join(chapterRoot, '000_索引小结.md'), 'utf8')).match(/^#\s+\d{2} (.+?)｜/)?.[1]) : null;
      const files = (await readdir(chapterRoot))
        .filter((name) => /^\d+_.+\.md$/i.test(name) && !(book === '估值原理' && name === '000_索引小结.md'))
        .sort((a, b) => a.localeCompare(b, 'zh-CN'));
      const variants = new Map();
      for (const file of files) {
        const variant = variantFor(file);
        const raw = await readFile(path.join(chapterRoot, file), 'utf8');
        const assets = assetBookSlug ? [...raw.matchAll(/\[[^\]]*\]\(assets\/([\w.-]+)\)/g)].map((match) => match[1]) : [];
        if (assets.length) {
          const publicDir = path.join(appRoot, 'public', assetBookSlug, chapterId);
          await mkdir(publicDir, { recursive: true });
          for (const asset of new Set(assets)) await copyFile(path.join(chapterRoot, 'assets', asset), path.join(publicDir, asset));
        }
        const content = assetBookSlug ? readerContent(raw, variant).replace(/(\[[^\]]*\]\()assets\/([\w.-]+)\)/g, `$1reader-web/public/${assetBookSlug}/${chapterId}/$2)`) : readerContent(raw, variant);
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
          chapterTitle: valuationTitle ?? (maoArticle ? `卷${maoArticle.volume} · ${maoArticle.title}` : extra ? extra[1] : book === '置身事内' ? zhishiTitles[number - 1] : book === '聪明的投资者' && number === 0 ? '序言与导论' : `第 ${number} ${book === '人生财富靠康波' ? '篇' : '章'}`),
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
    if (book === '系统化交易') {
      const guide = await readFile(path.join(booksRoot, book, '01_全书索引.md'), 'utf8');
      documents.push({
        id: `${book}/index/guide`, book, chapterId: 'index', chapterNumber: 0, sortOrder: 0,
        chapterTitle: '全书索引', title: '全书索引与章节小结', group: null,
        variant: '索引', preferred: true, batchCount: 1, locked: false, content: readerContent(guide, { key: 'guide' }),
      });
      for (let number = 1; number <= 15; number++) {
        const chapterId = `ch${String(number).padStart(2, '0')}`;
        if (documents.some((item) => item.book === book && item.chapterId === chapterId)) continue;
        documents.push({
          id: `${book}/${chapterId}/locked`, book, chapterId, chapterNumber: number, sortOrder: number,
          chapterTitle: `第 ${number} 章`, title: `第 ${number} 章`, group: null,
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

