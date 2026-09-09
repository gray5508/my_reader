'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, ChevronLeft, ChevronRight, Moon, PanelLeftClose, PanelLeftOpen, Settings2, Sun, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { library, type LibraryDocument } from './library.generated';

type Theme = 'paper' | 'green' | 'night';
type Block = { type: string; level?: number; text?: string; items?: string[]; kind?: string };
const defaultDocument = library.find((item) => item.preferred) ?? library[0];

function inline(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <span key={index} className="inline-link">{link[1]}</span>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] }); index += 1; continue; }
    if (/^---+$/.test(line)) { blocks.push({ type: 'rule' }); index += 1; continue; }
    if (line.startsWith('>')) {
      const collected: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) collected.push(lines[index++].trim().replace(/^>\s?/, ''));
      blocks.push({ type: 'quote', text: collected.join(' ') }); continue;
    }
    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line);
      const items: string[] = [];
      const pattern = ordered ? /^\d+\.\s+/ : /^[-*]\s+/;
      while (index < lines.length && pattern.test(lines[index].trim())) items.push(lines[index++].trim().replace(pattern, ''));
      blocks.push({ type: ordered ? 'ordered' : 'list', items }); continue;
    }
    const paragraph = [line]; index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,6})\s+|^---+$|^>\s?|^[-*]\s+|^\d+\.\s+/.test(lines[index].trim())) paragraph.push(lines[index++].trim());
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }
  return blocks;
}

function kindFor(text = '') {
  if (text.includes('伴读辅助｜我补充')) return 'helper';
  if (text.includes('作者原例')) return 'author-example';
  if (text.includes('原文观点')) return 'author-point';
  if (text.includes('边界提醒')) return 'boundary';
  return 'normal';
}

function MarkdownArticle({ source }: { source: LibraryDocument }) {
  const blocks = useMemo(() => {
    return parseBlocks(source.content.split(/\r?\n/)).reduce<{ kind: string; blocks: Block[] }>((result, block) => {
      const nextKind = block.type === 'rule'
        ? 'normal'
        : block.type === 'heading'
          ? (block.level === 3 ? kindFor(block.text) : 'normal')
          : result.kind;
      return { kind: nextKind, blocks: [...result.blocks, { ...block, kind: nextKind }] };
    }, { kind: 'normal', blocks: [] }).blocks;
  }, [source.content]);
  return <>{blocks.map((block, index) => {
    if (block.type === 'heading') {
      const Tag = `h${Math.min(block.level ?? 2, 4)}` as 'h1' | 'h2' | 'h3' | 'h4';
      return <Tag id={`section-${index}`} data-kind={block.kind} key={index}>{inline(block.text ?? '')}</Tag>;
    }
    if (block.type === 'rule') return <hr key={index} />;
    if (block.type === 'quote') return <blockquote data-kind={block.kind} key={index}>{inline(block.text ?? '')}</blockquote>;
    if (block.type === 'list' || block.type === 'ordered') {
      const List = block.type === 'ordered' ? 'ol' : 'ul';
      return <List data-kind={block.kind} key={index}>{block.items?.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</List>;
    }
    return <p data-kind={block.kind} key={index}>{inline(block.text ?? '')}</p>;
  })}</>;
}

function sliderValue(value: number | readonly number[]) {
  return typeof value === 'number' ? value : value[0];
}

export default function Home() {
  const [documentId, setDocumentId] = useState(defaultDocument?.id ?? '');
  const [theme, setTheme] = useState<Theme>('green');
  const [fontSize, setFontSize] = useState(20);
  const [lineHeight, setLineHeight] = useState(1.95);
  const [measure, setMeasure] = useState(760);
  const [progress, setProgress] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const currentDoc = library.find((item) => item.id === documentId) ?? defaultDocument;
  const chapterDocuments = library.filter((item) => item.chapterId === currentDoc?.chapterId);
  const chapters = Array.from(new Map(library.map((item) => [item.chapterId, item])).values());
  const toc = useMemo(() => currentDoc?.content.match(/^##\s+.+$/gm)?.map((line) => line.replace(/^##\s+/, '')) ?? [], [currentDoc]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('reader-preferences') || '{}');
    const restoreFrame = requestAnimationFrame(() => {
      if (saved.theme) setTheme(saved.theme);
      if (saved.fontSize) setFontSize(saved.fontSize);
      if (saved.lineHeight) setLineHeight(saved.lineHeight);
      if (saved.measure) setMeasure(saved.measure);
      if (saved.documentId && library.some((item) => item.id === saved.documentId)) setDocumentId(saved.documentId);
    });
    return () => cancelAnimationFrame(restoreFrame);
  }, []);
  useEffect(() => { localStorage.setItem('reader-preferences', JSON.stringify({ theme, fontSize, lineHeight, measure, documentId })); }, [theme, fontSize, lineHeight, measure, documentId]);
  useEffect(() => {
    const key = `reader-position:${documentId}`;
    requestAnimationFrame(() => window.scrollTo({ top: Number(localStorage.getItem(key) || 0) }));
    const update = () => {
      const available = globalThis.document.documentElement.scrollHeight - window.innerHeight;
      setProgress(available > 0 ? Math.min(100, (window.scrollY / available) * 100) : 0);
      localStorage.setItem(key, String(window.scrollY));
    };
    window.addEventListener('scroll', update, { passive: true }); update();
    return () => window.removeEventListener('scroll', update);
  }, [documentId]);

  function chooseChapter(chapterId: string) {
    const options = library.filter((item) => item.chapterId === chapterId);
    setDocumentId((options.find((item) => item.preferred) ?? options[0]).id);
    setSidebarOpen(false);
  }
  const chapterIndex = chapters.findIndex((item) => item.chapterId === currentDoc?.chapterId);
  if (!currentDoc) return <main className="empty-library">还没有可阅读的译文。</main>;

  return <div className="reader-shell" data-theme={theme} style={{ '--reader-size': `${fontSize}px`, '--reader-leading': lineHeight, '--reader-measure': `${measure}px` } as React.CSSProperties}>
    <header className="reader-bar">
      <div className="bar-left">
        <Button variant="ghost" size="icon" aria-label="打开章节目录" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}</Button>
        <BookOpenText className="brand-mark" aria-hidden="true" /><div><strong>静读</strong><span>{currentDoc.book}</span></div>
      </div>
      <div className="bar-center">
        <div className="bar-title"><span>{currentDoc.chapterTitle}</span><strong>{currentDoc.title.replace(/^第\s*\d+\s*章[　\s]*/, '')}</strong></div>
        <fieldset className="document-switcher"><legend className="sr-only">选择译文版本</legend>{chapterDocuments.map((item) => <button className={item.id === currentDoc.id ? 'active' : ''} key={item.id} onClick={() => setDocumentId(item.id)}>{item.preferred ? '易读版' : '忠实版'}<small>{item.variant}</small></button>)}</fieldset>
      </div>
      <div className="bar-actions">
        <Button variant="ghost" size="icon" aria-label="切换日夜主题" onClick={() => setTheme(theme === 'night' ? 'green' : 'night')}>{theme === 'night' ? <Sun /> : <Moon />}</Button>
        <Button variant="ghost" size="icon" aria-label="阅读设置" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}><Settings2 /></Button>
      </div>
      <Progress aria-label="本页阅读进度" value={progress} className="reading-progress" />
    </header>

    <aside className={`library-panel ${sidebarOpen ? 'is-open' : ''}`} aria-label="书籍目录">
      <div className="panel-heading"><div><span className="eyebrow">书架</span><h2>{currentDoc.book}</h2></div><Button className="mobile-close" variant="ghost" size="icon" aria-label="关闭目录" onClick={() => setSidebarOpen(false)}><X /></Button></div>
      <nav className="chapter-list">{chapters.map((chapter) => <button className={chapter.chapterId === currentDoc.chapterId ? 'active' : ''} key={chapter.chapterId} onClick={() => chooseChapter(chapter.chapterId)}><span>{String(chapter.chapterNumber).padStart(2, '0')}</span><div><strong>{chapter.chapterTitle}</strong><small>{library.filter((item) => item.chapterId === chapter.chapterId).length} 个版本</small></div></button>)}</nav>
      <div className="toc"><span className="eyebrow">本章目录</span>{toc.map((title, index) => <button key={`${title}-${index}`} onClick={() => globalThis.document.querySelectorAll('.reader-content h2')[index]?.scrollIntoView({ behavior: 'smooth' })}>{title}</button>)}</div>
    </aside>
    {sidebarOpen && <button className="scrim" aria-label="关闭目录" onClick={() => setSidebarOpen(false)} />}

    {settingsOpen && <aside className="settings-panel" aria-label="阅读设置">
      <div className="settings-title"><div><span className="eyebrow">阅读设置</span><h2>调到眼睛舒服为止</h2></div><Button variant="ghost" size="icon" aria-label="关闭阅读设置" onClick={() => setSettingsOpen(false)}><X /></Button></div>
      <div className="setting-control"><span>字号 <b>{fontSize}px</b></span><Slider aria-label="正文字号" min={16} max={30} step={1} value={[fontSize]} onValueChange={(value) => setFontSize(sliderValue(value))} /></div>
      <div className="setting-control"><span>行距 <b>{lineHeight.toFixed(2)}</b></span><Slider aria-label="正文行距" min={1.5} max={2.4} step={0.05} value={[lineHeight]} onValueChange={(value) => setLineHeight(sliderValue(value))} /></div>
      <div className="setting-control"><span>正文宽度 <b>{measure}px</b></span><Slider aria-label="正文宽度" min={560} max={940} step={20} value={[measure]} onValueChange={(value) => setMeasure(sliderValue(value))} /></div>
      <fieldset><legend>页面主题</legend><div className="theme-options">{([['paper','明亮'],['green','护眼'],['night','夜间']] as [Theme,string][]).map(([value,label]) => <button className={theme === value ? 'active' : ''} key={value} onClick={() => setTheme(value)}><i data-swatch={value} />{label}</button>)}</div></fieldset>
      <p className="settings-note">设置和阅读位置只保存在这台设备的浏览器里。</p>
    </aside>}

    <main className={`reading-stage ${sidebarOpen ? 'with-sidebar' : ''}`}><article className="reader-page">
      <div className="reader-content"><MarkdownArticle source={currentDoc} /></div>
      <footer className="chapter-footer"><Button variant="outline" disabled={chapterIndex <= 0} onClick={() => chooseChapter(chapters[chapterIndex - 1].chapterId)}><ChevronLeft />上一章</Button><span>读到这里会自动记住位置</span><Button variant="outline" disabled={chapterIndex < 0 || chapterIndex >= chapters.length - 1} onClick={() => chooseChapter(chapters[chapterIndex + 1].chapterId)}>下一章<ChevronRight /></Button></footer>
    </article></main>
  </div>;
}
