"""Export and verify one 《置身事内》 chapter from the supplied EPUB."""

from __future__ import annotations

import argparse
import posixpath
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
EPUB = ROOT / "ebook" / "置身事内.epub"
CHAPTERS = ROOT / "books" / "置身事内" / "chapters"
RANGES = [(7, 14), (15, 20), (21, 26), (27, 32),
          (34, 39), (40, 46), (47, 52), (53, 58)]
EXTRAS = {"foreword": 5, "part_i": 6, "part_ii": 33,
          "epilogue": 59, "bibliography": 60}


def name(node: ET.Element) -> str:
    return node.tag.rsplit("}", 1)[-1]


def source_files(unit: str) -> list[str]:
    lo, hi = (EXTRAS[unit], EXTRAS[unit]) if unit in EXTRAS else RANGES[int(unit) - 1]
    return [f"OEBPS/Text/part{n:04}.xhtml" for n in range(lo, hi + 1)]


def body(archive: zipfile.ZipFile, href: str) -> ET.Element:
    return next(x for x in ET.fromstring(archive.read(href)).iter() if name(x) == "body")


def elements(node: ET.Element):
    for child in node:
        if name(child) == "div":
            yield from elements(child)
        else:
            yield child


def render(unit: str, write: bool) -> tuple[str, int, int]:
    target = CHAPTERS / (unit if unit in EXTRAS else f"ch{int(unit):02}") / "003_原文版.md"
    lines: list[str] = []
    text_count = image_count = 0
    with zipfile.ZipFile(EPUB) as archive:
        for href in source_files(unit):
            for node in elements(body(archive, href)):
                kind = name(node)
                if kind == "img":
                    image_href = posixpath.normpath(posixpath.join(posixpath.dirname(href), node.attrib["src"]))
                    filename = posixpath.basename(image_href)
                    if write:
                        assets = target.parent / "assets"
                        assets.mkdir(parents=True, exist_ok=True)
                        (assets / filename).write_bytes(archive.read(image_href))
                    else:
                        assert (target.parent / "assets" / filename).read_bytes() == archive.read(image_href)
                    lines.extend([f"![原书插图](assets/{filename})", ""])
                    image_count += 1
                elif kind == "hr":
                    lines.extend(["---", ""])
                else:
                    content = "".join(node.itertext()).strip()
                    if not content:
                        continue
                    prefix = {"h1": "# ", "h2": "## ", "h3": "### ", "h4": "### "}.get(kind, "")
                    lines.extend([prefix + content, ""])
                    text_count += 1
    rendered = "\n".join(lines).rstrip() + "\n"
    if write:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(rendered, encoding="utf-8")
    else:
        assert target.read_text(encoding="utf-8") == rendered, "Original text or order differs from EPUB"
    return str(target), text_count, image_count


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("unit", choices=[*(str(n) for n in range(1, 9)), *EXTRAS])
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    print(*render(args.unit, write=not args.check))
