"""Transcribe one 《估值原理》 EPUB unit to the reader, then verify it."""

from __future__ import annotations

import argparse
import posixpath
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ebook" / "估值原理.epub"
BOOK = ROOT / "books" / "估值原理" / "chapters"


def tag(node: ET.Element) -> str:
    return node.tag.rsplit("}", 1)[-1]


def source_path(unit: int) -> str:
    if not 1 <= unit <= 26:
        raise ValueError("unit must be 1..26")
    return f"OEBPS/Text/part{unit + 9:02d}.xhtml"


def body_of(archive: zipfile.ZipFile, href: str) -> ET.Element:
    root = ET.fromstring(archive.read(href))
    return next(node for node in root.iter() if tag(node) == "body")


def export(unit: int) -> Path:
    href = source_path(unit)
    target = BOOK / f"ch{unit:02d}" / "003_原文版.md"
    assets = target.parent / "assets"
    lines = ["# EPUB 原文", "", f"来源：`{href}`。按用户提供的 EPUB 顺序转排；原书文字和疑似转制错误原样保留。", ""]
    with zipfile.ZipFile(SOURCE) as archive:
        body = body_of(archive, href)
        for node in body:
            kind = tag(node)
            content = "".join(node.itertext()).strip()
            if content:
                if kind == "h1":
                    lines[0] = f"# {content}"
                elif kind in {"h2", "h3", "h4"}:
                    lines.extend([f"## {content}", ""])
                else:
                    lines.extend([content, ""])
            for image in node.iter():
                if tag(image) != "img":
                    continue
                image_href = posixpath.normpath(posixpath.join(posixpath.dirname(href), image.attrib["src"]))
                name = posixpath.basename(image_href)
                assets.mkdir(parents=True, exist_ok=True)
                (assets / name).write_bytes(archive.read(image_href))
                lines.extend([f"![原书插图](assets/{name})", ""])
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    return target


def check(unit: int) -> tuple[int, int]:
    href = source_path(unit)
    target = BOOK / f"ch{unit:02d}" / "003_原文版.md"
    rendered = target.read_text(encoding="utf-8")
    paragraphs = images = 0
    with zipfile.ZipFile(SOURCE) as archive:
        for node in body_of(archive, href):
            content = "".join(node.itertext()).strip()
            if content and tag(node) != "h1":
                assert content in rendered, f"Missing text at {href}: {content[:40]}"
                paragraphs += 1
            for image in node.iter():
                if tag(image) == "img":
                    image_href = posixpath.normpath(posixpath.join(posixpath.dirname(href), image.attrib["src"]))
                    name = posixpath.basename(image_href)
                    assert (target.parent / "assets" / name).read_bytes() == archive.read(image_href)
                    assert f"(assets/{name})" in rendered
                    images += 1
    assert rendered.count("![原书插图]") == images
    return paragraphs, images


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("unit", type=int)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.check:
        print("Verified paragraphs and images:", *check(args.unit))
    else:
        print(export(args.unit))
