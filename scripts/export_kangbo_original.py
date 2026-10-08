"""Export one supplied Kangbo EPUB chapter, including its figures, for the offline reader."""

from __future__ import annotations

import argparse
import posixpath
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
BOOK = "人生财富靠康波"
SOURCE = ROOT / "ebook" / f"{BOOK}.epub"


def epub_href(chapter: int) -> str:
    if 1 <= chapter <= 8:
        return f"EPUB/xhtml/Chapter4_{chapter}"
    if 9 <= chapter <= 13:
        return f"EPUB/xhtml/Chapter5_{chapter - 8}"
    if 14 <= chapter <= 18:
        return f"EPUB/xhtml/Chapter6_{chapter - 13}"
    raise ValueError("chapter must be 1..18")


def export(chapter: int) -> tuple[Path, int]:
    href = epub_href(chapter)
    image_root = ROOT / "reader-web" / "public" / "kangbo" / f"ch{chapter:02d}"
    output = ROOT / "books" / BOOK / "chapters" / f"ch{chapter:02d}" / "003_原文版.md"
    lines = [f"# 第 {chapter} 篇｜EPUB 原文", "", f"来源：`{href}`。以下按 EPUB 正文顺序转排；图表取自同一 EPUB。", ""]
    image_count = 0
    with zipfile.ZipFile(SOURCE) as archive:
        root = ET.fromstring(archive.read(href))
        source_title = next(("".join(node.itertext()).strip() for node in root.iter() if node.tag.rsplit("}", 1)[-1] == "title"), "")
        if source_title:
            lines[0] = f"# {source_title}"
        body = next(node for node in root if node.tag.rsplit("}", 1)[-1] == "body")
        for node in body.iter():
            tag = node.tag.rsplit("}", 1)[-1]
            if tag == "img":
                source_image = posixpath.normpath(posixpath.join(posixpath.dirname(href), node.attrib["src"]))
                if source_image not in archive.namelist():
                    raise FileNotFoundError(source_image)
                image_root.mkdir(parents=True, exist_ok=True)
                name = posixpath.basename(source_image)
                (image_root / name).write_bytes(archive.read(source_image))
                lines.extend([f"![原书图表 {image_count + 1}](reader-web/public/kangbo/ch{chapter:02d}/{name})", ""])
                image_count += 1
            elif tag in {"p", "h1", "h2", "h3", "h4"}:
                content = re.sub(r"\s+", " ", "".join(node.itertext())).strip()
                if not content:
                    continue
                # The EPUB's first three display headings repeat the title above.
                if tag == "h2" and content in {f"{chapter:02d}", "人生财富靠康波", "——康波中的价格波动"}:
                    continue
                bold = tag.startswith("h") or any("font-weight: bold" in child.attrib.get("style", "") for child in node.iter())
                heading = bold and len(content) <= 28 and not re.match(r"[▲▼]?\s*[图表]\d", content)
                lines.extend([f"## {content}" if heading else content, ""])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    return output, image_count


def check(chapter: int) -> tuple[int, int]:
    href = epub_href(chapter)
    output = ROOT / "books" / BOOK / "chapters" / f"ch{chapter:02d}" / "003_原文版.md"
    rendered = output.read_text(encoding="utf-8")
    paragraphs = images = 0
    with zipfile.ZipFile(SOURCE) as archive:
        root = ET.fromstring(archive.read(href))
        body = next(node for node in root if node.tag.rsplit("}", 1)[-1] == "body")
        for node in body.iter():
            tag = node.tag.rsplit("}", 1)[-1]
            if tag == "p":
                content = re.sub(r"\s+", " ", "".join(node.itertext())).strip()
                if content:
                    assert content in rendered, f"Missing source paragraph: {content[:50]}"
                    paragraphs += 1
            elif tag == "img":
                source_image = posixpath.normpath(posixpath.join(posixpath.dirname(href), node.attrib["src"]))
                name = posixpath.basename(source_image)
                local = ROOT / "reader-web" / "public" / "kangbo" / f"ch{chapter:02d}" / name
                assert local.read_bytes() == archive.read(source_image), f"Image mismatch: {name}"
                images += 1
    assert rendered.count("![原书图表 ") == images, "Image references do not match EPUB"
    return paragraphs, images


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("chapter", type=int)
    parser.add_argument("--check", action="store_true", help="verify exported text and figures against EPUB")
    args = parser.parse_args()
    if args.check:
        paragraphs, images = check(args.chapter)
        print(f"Verified {paragraphs} source paragraphs and {images} original images")
    else:
        result, count = export(args.chapter)
        print(f"Exported {result} with {count} images")
