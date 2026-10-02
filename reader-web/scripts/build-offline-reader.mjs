import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { appRoot, projectRoot, collectLibrary, writeOfflineLibrary } from './library-data.mjs';

const outputPath = path.join(projectRoot, '打开阅读器.html');
const template = await readFile(path.join(appRoot, 'offline-reader.html'), 'utf8');
const script = await readFile(path.join(appRoot, 'offline-reader.js'), 'utf8');
const documents = await collectLibrary();

const html = template.replace('<!-- READER_SCRIPT -->', `<script>\n${script}</script>`);
await writeFile(outputPath, html, 'utf8');
const dataPath = await writeOfflineLibrary(documents);
console.log(`Built fixed offline reader shell: ${outputPath}`);
console.log(`Synced ${documents.length} assembled reading documents: ${dataPath}`);
