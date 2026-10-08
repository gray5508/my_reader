#!/usr/bin/env python3
"""Export one Thinking, Fast and Slow EPUB unit to source-order Markdown."""

import argparse
import posixpath
import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

from book_source import epub_blocks
from thinking_source import BOOK, ROOT, load_index


def tag(node):
    return node.tag.rsplit("}", 1)[-1].lower()


def export(unit_id):
    index = load_index()
    unit = next((u for u in index["units"] if u["id"] == unit_id), None)
    if unit is None:
        raise ValueError(f"Unknown unit: {unit_id}")
    href = unit["epub_href"]
    image_dir = ROOT / "reader-web" / "public" / "thinking" / unit_id
    output = BOOK / "chapters" / unit_id / "001_原文版.md"
    lines = [f"# {unit['title']}｜英文原文", "",
             f"- 主源：英文 EPUB，SHA-256 `{index['source']['sha256']}`。",
             f"- 范围：`{href}`；EPUB 抽取块不是印刷页码。",
             "- 说明：按 EPUB 顺序转排文字与有内容的原图；斜体、上标及其他版式可能变化，精确核对请回原 EPUB。", ""]
    images = {}
    with zipfile.ZipFile(ROOT / index["source"]["path"]) as epub:
        root = ET.fromstring(epub.read(href))
        source_blocks = epub_blocks(epub, href)
        copied_blocks = []
        for node in root.iter():
            kind = tag(node)
            if kind == "img":
                src = node.attrib.get("src", "")
                asset = posixpath.normpath(posixpath.join(posixpath.dirname(href), src))
                if src:
                    if asset not in images:
                        images[asset] = f"figure-{len(images) + 1}{Path(asset).suffix.lower()}"
                        image_dir.mkdir(parents=True, exist_ok=True)
                        (image_dir / images[asset]).write_bytes(epub.read(asset))
                    lines += [f"![英文 EPUB 原图 {len(images)}](reader-web/public/thinking/{unit_id}/{images[asset]})", ""]
            if kind not in {"p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "pre", "td", "th"}:
                continue
            if any(tag(child) in {"p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "pre", "td", "th"}
                   for child in node.iter() if child is not node):
                continue
            content = re.sub(r"\s+", " ", "".join(node.itertext())).strip()
            if content:
                copied_blocks.append(content)
                lines += [("### " if kind.startswith("h") else "") + content, ""]
    if copied_blocks != source_blocks:
        raise ValueError(f"Export block mismatch: {len(copied_blocks)} vs {len(source_blocks)}")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    print(f"{output}: {len(source_blocks)} blocks, {len(images)} images")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--unit", required=True)
    export(parser.parse_args().unit)
