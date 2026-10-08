const library = globalThis.__READER_LIBRARY__ || [];
const app = document.getElementById('app');
const storage = {
  get(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch {} },
};
const saved = (() => { try { return JSON.parse(storage.get('reader-preferences', '{}')); } catch { return {}; } })();
const validDocument = (id) => library.find((item) => item.id === id);
const bookNames = [...new Set(library.map((item) => item.book))];
const preferred = library.find((item) => item.preferred) || library[0];
const validSaved = validDocument(saved.documentId);
const state = {
  view: validSaved ? 'reader' : 'home',
  hasOpenedBook: Boolean(validSaved),
  documentId: validSaved?.id || preferred?.id || '',
  lastBookDocuments: saved.lastBookDocuments || {},
  maoGroup: typeof saved.maoGroup === 'string' ? saved.maoGroup : '全部篇目',
  theme: ['paper', 'green', 'sepia', 'blue', 'night'].includes(saved.theme) ? saved.theme : 'green',
  customColor: /^#[0-9a-f]{6}$/i.test(saved.customColor) ? saved.customColor : '',
  fontSize: Number(saved.fontSize) || 20,
  lineHeight: Number(saved.lineHeight) || 1.95,
  measure: Number(saved.measure) || 760,
  sidebarOpen: innerWidth > 900,
  settingsOpen: false,
};

function esc(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function inline(text){return esc(text).replace(/!\[([^\]]*)\]\((reader-web\/public\/[\w-]+\/[\w-]+\/[\w.-]+)\)/g,'<img src="$2" alt="$1" loading="lazy">').replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g,'<a class="inline-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\[([^\]]+)\]\([^)]+\)/g,'<span class="inline-link">$1</span>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>').replace(/\x60([^\x60]+)\x60/g,'<code>$1</code>')}
function kindFor(text){if(text.includes('伴读辅助｜我补充'))return'helper';if(text.includes('作者原例'))return'author-example';if(text.includes('原文观点'))return'author-point';if(text.includes('边界提醒'))return'boundary';return'normal'}
function markdown(source){const lines=source.split(/\r?\n/),blocks=[];const tableRow=line=>line.trim().startsWith('|')&&line.trim().endsWith('|');const cells=line=>line.trim().slice(1,-1).split('|').map(cell=>cell.trim());let i=0,kind='normal';while(i<lines.length){const line=lines[i].trim();if(!line){i++;continue}const heading=line.match(/^(#{1,6})\s+(.+)$/);if(heading){kind=heading[1].length===3?kindFor(heading[2]):'normal';blocks.push({type:'heading',level:heading[1].length,text:heading[2],kind});i++;continue}if(/^---+$/.test(line)){kind='normal';blocks.push({type:'rule',kind});i++;continue}if(tableRow(line)&&i+1<lines.length&&/^\|(?:\s*:?-{3,}:?\s*\|)+$/.test(lines[i+1].trim())){const head=cells(line),rows=[];i+=2;while(i<lines.length&&tableRow(lines[i]))rows.push(cells(lines[i++]));blocks.push({type:'table',head,rows,kind});continue}if(line.startsWith('>')){const parts=[];while(i<lines.length&&lines[i].trim().startsWith('>'))parts.push(lines[i++].trim().replace(/^>\s?/,''));blocks.push({type:'quote',text:parts.join(' '),kind});continue}if(/^[-*]\s+/.test(line)||/^\d+\.\s+/.test(line)){const ordered=/^\d+\.\s+/.test(line),pattern=ordered?/^\d+\.\s+/:/^[-*]\s+/,items=[];while(i<lines.length&&pattern.test(lines[i].trim()))items.push(lines[i++].trim().replace(pattern,''));blocks.push({type:ordered?'ordered':'list',items,kind});continue}const parts=[line];i++;while(i<lines.length&&lines[i].trim()&&!/^(#{1,6})\s+|^---+$|^>\s?|^\|.+\|$|^[-*]\s+|^\d+\.\s+/.test(lines[i].trim()))parts.push(lines[i++].trim());blocks.push({type:'paragraph',text:parts.join(' '),kind})}return blocks.map((block,index)=>{const attr=' data-kind="'+block.kind+'"';if(block.type==='heading'){const level=Math.min(block.level||2,4);return'<h'+level+' id="section-'+index+'"'+attr+'>'+inline(block.text)+'</h'+level+'>'}if(block.type==='rule')return'<hr>';if(block.type==='quote')return'<blockquote'+attr+'>'+inline(block.text)+'</blockquote>';if(block.type==='table')return'<div class="table-wrap"><table'+attr+'><thead><tr>'+block.head.map(cell=>'<th>'+inline(cell)+'</th>').join('')+'</tr></thead><tbody>'+block.rows.map(row=>'<tr>'+row.map(cell=>'<td>'+inline(cell)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';if(block.type==='list'||block.type==='ordered'){const tag=block.type==='ordered'?'ol':'ul';return'<'+tag+attr+'>'+block.items.map(item=>'<li>'+inline(item)+'</li>').join('')+'</'+tag+'>'}return'<p'+attr+'>'+inline(block.text)+'</p>'}).join('')}


function current() { return validDocument(state.documentId) || preferred; }
function chapterKey(item) { return item.book + '::' + item.chapterId; }
function chapters(book) {
  return Array.from(new Map(library.filter((item) => item.book === book).map((item) => [chapterKey(item), item])).values());
}
function openChapters(book) { return chapters(book).filter((item) => !item.locked); }
function visibleChapters(book) {
  const items = chapters(book);
  return book === '毛泽东选集' && state.maoGroup !== '全部篇目'
    ? items.filter((item) => item.group === state.maoGroup) : items;
}
function visibleOpenChapters(book) { return visibleChapters(book).filter((item) => !item.locked); }
function versionsFor(item) { return library.filter((candidate) => chapterKey(candidate) === chapterKey(item)); }
function lastDocumentFor(book) {
  return validDocument(state.lastBookDocuments[book])?.book === book
    ? validDocument(state.lastBookDocuments[book])
    : library.find((item) => item.book === book && item.preferred) || library.find((item) => item.book === book);
}
function persist() {
  storage.set('reader-preferences', JSON.stringify({
    documentId: state.hasOpenedBook ? state.documentId : null, lastBookDocuments: state.lastBookDocuments,
    maoGroup: state.maoGroup,
    theme: state.theme, customColor: state.customColor,
    fontSize: state.fontSize, lineHeight: state.lineHeight, measure: state.measure,
  }));
}
function savePosition() {
  if (state.view === 'reader' && positionReady && current()) {
    storage.set('reader-position:' + state.documentId, String(scrollY));
  }
}
function syncStyle() {
  const shell = app.querySelector('.reader-shell');
  if (!shell) return;
  shell.dataset.theme = state.theme;
  shell.dataset.customBg = String(Boolean(state.customColor));
  shell.style.setProperty('--reader-tint', state.customColor || '#ffffff');
  shell.style.setProperty('--reader-size', state.fontSize + 'px');
  shell.style.setProperty('--reader-leading', state.lineHeight);
  shell.style.setProperty('--reader-measure', state.measure + 'px');
  app.querySelectorAll('[data-theme-choice]').forEach((button) => {
    button.classList.toggle('active', button.dataset.themeChoice === state.theme && !state.customColor);
  });
  const color = app.querySelector('[data-custom-color]');
  if (color) color.value = state.customColor || '#e6dfc7';
  for (const [id, value] of [['font-value', state.fontSize + 'px'], ['line-value', state.lineHeight.toFixed(2)], ['measure-value', state.measure + 'px']]) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }
  persist();
}
function syncPanels() {
  app.querySelector('.library-panel')?.classList.toggle('is-open', state.sidebarOpen);
  app.querySelector('.reading-stage')?.classList.toggle('with-sidebar', state.sidebarOpen);
  app.querySelector('.scrim')?.classList.toggle('is-open', state.sidebarOpen);
  const settings = app.querySelector('.settings-panel');
  if (settings) settings.hidden = !state.settingsOpen;
  const menu = document.getElementById('menu-button');
  if (menu) { menu.textContent = state.sidebarOpen ? '‹' : '☰'; menu.setAttribute('aria-expanded', String(state.sidebarOpen)); }
  document.getElementById('settings-button')?.setAttribute('aria-expanded', String(state.settingsOpen));
}
function renderHome() {
  positionReady = false;
  app.innerHTML = `<div class="reader-shell" data-theme="${esc(state.theme)}"><main class="book-home">
    <div class="home-heading"><span class="eyebrow">本地伴读 · 书架</span><h1>选一本书，接着读</h1><p>每本书有自己的目录和上次阅读位置。</p></div>
    <div class="book-grid">${bookNames.map((book, index) => {
      const last = lastDocumentFor(book);
      const count = chapters(book).length;
      const hasHistory = validDocument(state.lastBookDocuments[book])?.book === book;
      const companion = book === '人生财富靠康波';
      const mao = book === '毛泽东选集';
      const detail = mao ? `${openChapters(book).length} 篇精选已就绪 · 共 ${count} 篇` : companion ? `${count} 篇伴读已就绪` : `${count} 章已有译文 · 忠实版 / 易读版`;
      const entry = mao ? `${esc(last.chapterTitle)}` : `第 ${last.chapterNumber} ${companion ? '篇' : '章'}`;
      return `<button class="book-card" data-book="${index}"><span class="book-cover" aria-hidden="true">${esc(book.slice(0, 1))}</span><span class="book-info"><strong>《${esc(book)}》</strong><small>${detail}</small><span>${hasHistory ? '继续' : '开始'}${entry} →</span></span></button>`;
    }).join('')}</div>
    ${!bookNames.length ? '<p class="empty-library">还没有可阅读的译文。</p>' : ''}
  </main></div>`;
  syncStyle();
  scrollTo({ top: 0, behavior: 'instant' });
}
function settingsMarkup() {
  return `<aside class="settings-panel" aria-label="阅读设置" hidden><div class="settings-title"><div><span class="eyebrow">阅读设置</span><h2>调到眼睛舒服为止</h2></div><button data-close-settings class="icon-button" aria-label="关闭阅读设置">×</button></div>
    <label class="setting-control"><span>字号 <b id="font-value">${state.fontSize}px</b></span><input data-setting="fontSize" type="range" min="16" max="30" step="1" value="${state.fontSize}"></label>
    <label class="setting-control"><span>行距 <b id="line-value">${state.lineHeight.toFixed(2)}</b></span><input data-setting="lineHeight" type="range" min="1.5" max="2.4" step="0.05" value="${state.lineHeight}"></label>
    <label class="setting-control"><span>正文宽度 <b id="measure-value">${state.measure}px</b></span><input data-setting="measure" type="range" min="560" max="940" step="20" value="${state.measure}"></label>
    <fieldset><legend>页面主题</legend><div class="theme-options">${[['paper', '明亮'], ['green', '护眼'], ['sepia', '暖纸'], ['blue', '雾蓝'], ['night', '夜间']].map(([key, label]) => `<button data-theme-choice="${key}"><i data-swatch="${key}"></i>${label}</button>`).join('')}</div></fieldset>
    <label class="custom-color">自选背景色 <input data-custom-color type="color" value="${state.customColor || '#e6dfc7'}" aria-label="自选背景色"></label>
    <p class="settings-note">自选颜色会柔和地融入页面背景。设置和阅读位置保存在当前浏览器。</p></aside>`;
}
let positionReady = false;
function renderReader() {
  const doc = current();
  if (!doc) { renderHome(); return; }
  if (doc.book === '毛泽东选集' && state.maoGroup !== '全部篇目' && doc.group !== state.maoGroup) state.maoGroup = '全部篇目';
  state.view = 'reader';
  positionReady = false;
  const bookChapters = visibleOpenChapters(doc.book);
  const chapterIndex = bookChapters.findIndex((item) => chapterKey(item) === chapterKey(doc));
  const versions = versionsFor(doc);
  const toc = (doc.content.match(/^##\s+.+$/gm) || []).map((line) => line.replace(/^##\s+/, ''));
  const allChapters = chapters(doc.book);
  const groupNames = [...new Set(allChapters.filter((item) => !item.locked).map((item) => item.group).filter(Boolean))];
  const groupPicker = doc.book === '毛泽东选集' ? `<label class="group-picker">主题分组<select data-group-filter aria-label="按主题分组查看篇目"><option value="全部篇目">全部篇目 · ${allChapters.length}</option>${groupNames.map((name) => `<option value="${esc(name)}" ${state.maoGroup === name ? 'selected' : ''}>${esc(name)} · ${allChapters.filter((item) => !item.locked && item.group === name).length}</option>`).join('')}</select></label>` : '';
  const chapterButtons = allChapters.map((item, index) => ({ item, index })).filter(({ item }) => state.maoGroup === '全部篇目' || doc.book !== '毛泽东选集' || item.group === state.maoGroup).map(({ item, index }) => `<button data-chapter="${index}" class="${chapterKey(item) === chapterKey(doc) ? 'active' : ''}" ${item.locked ? 'disabled aria-label="待伴读，暂不可选"' : ''}><span>${String(item.chapterNumber).padStart(2, '0')}</span><div><strong>${esc(item.chapterTitle)}</strong><small>${item.locked ? '待伴读' : item.variant === '伴读' ? '伴读已就绪' : `${versionsFor(item).length} 个版本`}</small></div></button>`).join('');
  app.innerHTML = `<div class="reader-shell" data-theme="${esc(state.theme)}">
    <header class="reader-bar"><div class="bar-left"><button id="menu-button" class="icon-button" aria-label="打开章节目录" aria-expanded="false">☰</button><button class="book-home-link" data-home>书架</button><div class="current-book"><strong>《${esc(doc.book)}》</strong><span>${esc(doc.chapterTitle)}</span></div></div>
      <div class="bar-center"><div class="bar-title"><span>${esc(doc.chapterTitle)}</span><strong>${esc(doc.title.replace(/^第\s*\d+\s*[章篇][｜　\s]*/, ''))}</strong></div><fieldset class="document-switcher"><legend class="sr-only">选择阅读内容</legend>${versions.map((item, index) => `<button data-version="${index}" class="${item.id === doc.id ? 'active' : ''}">${item.variant === '伴读' || item.variant === '原文版' ? item.variant : item.preferred ? '易读版' : '忠实版'}</button>`).join('')}</fieldset></div>
      <div class="bar-actions"><button id="theme-button" class="icon-button" aria-label="切换日夜主题">◐</button><button id="settings-button" class="icon-button" aria-label="阅读设置" aria-expanded="false">Aa</button></div><div id="reading-progress" class="reading-progress" role="progressbar" aria-label="本页阅读进度" aria-valuemin="0" aria-valuemax="100"></div></header>
    <aside class="library-panel" aria-label="${esc(doc.book)}章节目录"><div class="panel-heading"><div><span class="eyebrow">当前书籍</span><h2>《${esc(doc.book)}》</h2></div><button data-close-sidebar class="icon-button mobile-close" aria-label="关闭目录">×</button></div><button class="back-to-books" data-home>← 返回书架，选择其他书</button>
      ${groupPicker}<nav class="chapter-list">${chapterButtons}</nav>
      <div class="toc"><span class="eyebrow">本章目录</span>${toc.map((title, index) => `<button data-toc="${index}">${esc(title)}</button>`).join('')}</div></aside>
    <button class="scrim" data-close-sidebar aria-label="关闭目录"></button>${settingsMarkup()}
    <main class="reading-stage"><article class="reader-page"><div class="reader-content">${markdown(doc.content)}</div><footer class="chapter-footer"><button class="outline-button" data-prev ${chapterIndex <= 0 ? 'disabled' : ''}>‹ 上一章</button><span>阅读位置会自动保存</span><button class="outline-button" data-next ${chapterIndex >= bookChapters.length - 1 ? 'disabled' : ''}>下一章 ›</button></footer></article></main></div>`;
  syncStyle();
  syncPanels();
  requestAnimationFrame(() => {
    scrollTo({ top: Number(storage.get('reader-position:' + doc.id, '0')) || 0, behavior: 'instant' });
    requestAnimationFrame(() => { positionReady = true; updateProgress(false); });
  });
}
function openBook(book) {
  const doc = lastDocumentFor(book);
  if (!doc) return;
  state.hasOpenedBook = true;
  state.documentId = doc.id;
  state.sidebarOpen = innerWidth > 900;
  state.settingsOpen = false;
  state.lastBookDocuments[book] = doc.id;
  persist();
  renderReader();
}
function chooseChapter(index) {
  const item = chapters(current().book)[index];
  if (!item || item.locked) return;
  savePosition();
  const options = versionsFor(item);
  state.documentId = (options.find((candidate) => candidate.preferred) || options[0]).id;
  state.lastBookDocuments[item.book] = state.documentId;
  state.sidebarOpen = innerWidth > 900;
  state.settingsOpen = false;
  persist();
  renderReader();
}
function updateProgress(save = true) {
  if (state.view !== 'reader') return;
  const available = document.documentElement.scrollHeight - innerHeight;
  const value = available > 0 ? Math.min(100, scrollY / available * 100) : 0;
  const bar = document.getElementById('reading-progress');
  if (bar) { bar.style.width = value + '%'; bar.setAttribute('aria-valuenow', String(Math.round(value))); }
  if (save) savePosition();
}
app.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.book !== undefined) { openBook(bookNames[Number(target.dataset.book)]); return; }
  if (target.hasAttribute('data-home')) { savePosition(); state.view = 'home'; state.settingsOpen = false; renderHome(); return; }
  if (target.id === 'menu-button') { state.sidebarOpen = !state.sidebarOpen; syncPanels(); return; }
  if (target.id === 'settings-button') { state.settingsOpen = !state.settingsOpen; syncPanels(); return; }
  if (target.id === 'theme-button') { state.theme = state.theme === 'night' ? 'green' : 'night'; state.customColor = ''; syncStyle(); return; }
  if (target.hasAttribute('data-close-sidebar')) { state.sidebarOpen = false; syncPanels(); return; }
  if (target.hasAttribute('data-close-settings')) { state.settingsOpen = false; syncPanels(); return; }
  if (target.dataset.themeChoice) { state.theme = target.dataset.themeChoice; state.customColor = ''; syncStyle(); return; }
  if (target.dataset.chapter !== undefined) { chooseChapter(Number(target.dataset.chapter)); return; }
  if (target.dataset.version !== undefined) {
    savePosition();
    const doc = versionsFor(current())[Number(target.dataset.version)];
    if (!doc) return;
    state.documentId = doc.id;
    state.lastBookDocuments[doc.book] = doc.id;
    persist(); renderReader(); return;
  }
  if (target.dataset.toc !== undefined) {
    document.querySelectorAll('.reader-content h2')[Number(target.dataset.toc)]?.scrollIntoView({ behavior: 'smooth' });
    if (innerWidth <= 900) { state.sidebarOpen = false; syncPanels(); }
    return;
  }
  const list = visibleOpenChapters(current().book);
  const index = list.findIndex((item) => chapterKey(item) === chapterKey(current()));
  if (target.hasAttribute('data-prev') && index > 0) chooseChapter(chapters(current().book).findIndex((item) => chapterKey(item) === chapterKey(list[index - 1])));
  if (target.hasAttribute('data-next') && index < list.length - 1) chooseChapter(chapters(current().book).findIndex((item) => chapterKey(item) === chapterKey(list[index + 1])));
});
app.addEventListener('change', (event) => {
  if (!event.target.matches('[data-group-filter]')) return;
  state.maoGroup = event.target.value;
  const selected = visibleOpenChapters('毛泽东选集');
  const match = selected.some((item) => chapterKey(item) === chapterKey(current()));
  if (selected.length && !match) chooseChapter(chapters('毛泽东选集').findIndex((item) => chapterKey(item) === chapterKey(selected[0])));
  else { persist(); renderReader(); }
});
app.addEventListener('input', (event) => {
  if (event.target.matches('[data-custom-color]')) {
    state.customColor = event.target.value;
    state.theme = 'paper';
    syncStyle();
    return;
  }
  const name = event.target.dataset.setting;
  if (!name) return;
  state[name] = Number(event.target.value);
  syncStyle();
});
addEventListener('scroll', () => updateProgress(), { passive: true });
if (validSaved) { state.lastBookDocuments[validSaved.book] = validSaved.id; renderReader(); }
else renderHome();
