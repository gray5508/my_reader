import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { collectLibrary, projectRoot, readerContent } from './library-data.mjs';

const documents = (await collectLibrary()).filter((item) => !item.locked);
const books = new Set(documents.map((item) => item.book));
assert.ok(books.size >= 7);
for (const item of documents) {
  assert.match(item.content, /^# /, item.id);
  assert.doesNotMatch(item.content, /(?:OEBPS\/|OPS\/|EPUB\/|\bpart\d+\.xhtml\b|\bsplit_\d+|^## 来源与覆盖|^## EPUB `)/m, item.id);
}
const chapter = documents.filter((item) => item.book === '估值原理' && item.chapterId === 'ch02');
for (const variant of ['伴读', '中文语境易读版', '原文版']) {
  const item = chapter.find((document) => document.variant === variant);
  assert.ok(item, variant);
  assert.match(item.content, /市场与社会|一套房不卖|绝大多数情况下/, item.id);
}
assert.match(await readFile(path.join(projectRoot, 'books', '估值原理', 'chapters', 'ch02', '001_伴读.md'), 'utf8'), /OEBPS\/Text\/part11\.xhtml/);
let checkedBodies = 0;
for (const book of books) {
  const chaptersRoot = path.join(projectRoot, 'books', book, 'chapters');
  for (const chapter of await readdir(chaptersRoot, { withFileTypes: true })) {
    if (!chapter.isDirectory()) continue;
    const folder = path.join(chaptersRoot, chapter.name);
    for (const file of await readdir(folder)) {
      if (!/^\d+_.*\.md$/.test(file)) continue;
      const raw = await readFile(path.join(folder, file), 'utf8');
      const bodyLine = raw.split(/\r?\n/).slice(10).findLast((line) => line.length > 80 && !/(?:EPUB|OPS\/|OEBPS\/|xhtml|html|split_|offset|Source:|正文块|文字块|下一位置)/i.test(line));
      if (!bodyLine) continue;
      assert.ok(readerContent(raw, { key: file.includes('原文版') ? 'original' : 'other' }).includes(bodyLine.slice(0, 50)), `${book}/${chapter.name}/${file}`);
      checkedBodies++;
    }
  }
}
console.log(`Checked ${documents.length} reading documents across ${books.size} books and ${checkedBodies} body anchors.`);
