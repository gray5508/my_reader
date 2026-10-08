#!/usr/bin/env python3
"""Export one Antifragile EPUB unit as readable original-text Markdown."""

import argparse
import posixpath
import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

from book_source import BOOK, ROOT, epub_blocks, load_index


def tag_name(node):
    return node.tag.rsplit("}", 1)[-1].lower()


def export(unit_id):
    index = load_index(("en",))
    unit = next((item for item in index["units"] if item["id"] == unit_id), None)
    if unit is None:
        raise ValueError(f"Unknown unit: {unit_id}")
    chapter_dir = BOOK / "chapters" / unit_id
    chapter_dir.mkdir(parents=True, exist_ok=True)
    image_dir = ROOT / "reader-web" / "public" / "antifragile" / unit_id
    lines = [
        f"# {unit['en_title']}｜英文原文",
        "",
        f"- 主源：英文 EPUB，SHA-256：`{index['en']['sha256']}`",
        f"- 范围：`{unit['en_epub_spine'][0]}` 至 `{unit['en_epub_spine'][-1]}`",
        "- 说明：按 EPUB 正文顺序转排，保留文字和有内容的原图；空白装饰图略去。空白、斜体等版式可能与 EPUB 不同；需核对时以 EPUB 为准。",
        "",
    ]
    image_names = {}
    source_text = []
    with zipfile.ZipFile(ROOT / index["en"]["path"]) as epub:
        for href in unit["en_epub_spine"]:
            root = ET.fromstring(epub.read(href))
            original_blocks = epub_blocks(epub, href)
            source_text.extend(original_blocks)
            lines.extend([f"## EPUB `{href}`", ""])
            block_count = 0
            for node in root.iter():
                tag = tag_name(node)
                if tag == "img":
                    src = node.attrib.get("src", "").split("#", 1)[0]
                    asset = posixpath.normpath(posixpath.join(posixpath.dirname(href), src))
                    if src and posixpath.basename(asset) not in {"00009.jpg", "00075.jpg"}:
                        if asset not in image_names:
                            suffix = Path(asset).suffix.lower()
                            image_names[asset] = f"figure-{len(image_names) + 1}{suffix}"
                            image_dir.mkdir(parents=True, exist_ok=True)
                            (image_dir / image_names[asset]).write_bytes(epub.read(asset))
                        lines.extend([
                            f"![英文 EPUB 原图 {list(image_names).index(asset) + 1}](reader-web/public/antifragile/{unit_id}/{image_names[asset]})",
                            "",
                        ])
                if tag not in {"p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "pre", "td", "th"}:
                    continue
                if any(tag_name(child) in {"p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "pre", "td", "th"}
                       for child in node.iter() if child is not node):
                    continue
                content = re.sub(r"\s+", " ", "".join(node.itertext())).strip()
                if not content:
                    continue
                block_count += 1
                prefix = "### " if tag.startswith("h") else ""
                lines.extend([prefix + content, ""])
            if block_count != len(original_blocks):
                raise ValueError(f"Text-block count differs in {href}: {block_count} vs {len(original_blocks)}")
    output = chapter_dir / "001_原文版.md"
    result = "\n".join(lines).rstrip() + "\n"
    if any(block not in result for block in source_text):
        raise ValueError("Export omitted source text")
    output.write_text(result, encoding="utf-8")
    print(f"{output}: {len(source_text)} text blocks, {len(image_names)} source images")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--unit", required=True)
    export(parser.parse_args().unit)
