import { collectLibrary, writeOfflineLibrary } from './library-data.mjs';

const documents = await collectLibrary();
const outputPath = await writeOfflineLibrary(documents);
console.log(`Synced ${documents.length} assembled reading documents: ${outputPath}`);

