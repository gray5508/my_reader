#!/usr/bin/env python3
"""Locate and read the supplied Systematic Trading EPUB without extracting it wholesale."""
from __future__ import annotations

import argparse
import hashlib
import json
import posixpath
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ebook" / "Systematic Trading.epub"
OUT = ROOT / "books" / "系统化交易" / "sources"
INDEX = OUT / "source_index.json"
CHAPTER_DOCS = [8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24, 25]
EXTRA_DOCS = {"preface": 5, "introduction": 6, "epilogue": 26, "glossary": 27,
              "appendix_a": 29, "appendix_b": 30, "appendix_c": 31, "appendix_d": 32,
              "acknowledgements": 33}


def href(number: int) -> str:
    return f"OEBPS/Autopilot_ebook-{number}.xhtml"


def tag(node: ET.Element) -> str:
    return node.tag.rsplit("}", 1)[-1]


def clean(node: ET.Element) -> str:
    return re.sub(r"\s+", " ", "".join(node.itertext())).strip()


def blocks(z: zipfile.ZipFile, path: str) -> list[dict]:
    root = ET.fromstring(z.read(path))
    body = next(e for e in root.iter() if tag(e) == "body")
    result = []
    for node in body.iter():
        kind = tag(node)
        if kind not in {"p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "img"}:
            continue
        if kind == "img":
            result.append({"type": "image", "text": node.attrib.get("src", "")})
        elif text := clean(node):
            result.append({"type": kind, "text": text})
    return result


def build_index() -> None:
    with zipfile.ZipFile(SOURCE) as z:
        paths = {f"ch{i:02d}": href(n) for i, n in enumerate(CHAPTER_DOCS, 1)}
        paths.update({name: href(n) for name, n in EXTRA_DOCS.items()})
        units = []
        for name, path in paths.items():
            rows = blocks(z, path)
            title = next((r["text"] for r in rows if r["type"].startswith("h")), name)
            units.append({"id": name, "title": title, "href": path,
                          "paragraphs": sum(r["type"] == "p" for r in rows),
                          "images": sum(r["type"] == "image" for r in rows),
                          "words_approx": sum(len(r["text"].split()) for r in rows if r["type"] != "image")})
    data = {"title": "Systematic Trading", "author": "Robert Carver",
            "source": "ebook/Systematic Trading.epub", "published": 2015,
            "sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
            "bytes": SOURCE.stat().st_size,
            "location_note": "EPUB href and block numbers are not print page numbers. Tables, images, formulas, and footnotes require checking original XHTML and assets.",
            "units": units}
    OUT.mkdir(parents=True, exist_ok=True)
    INDEX.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = ["# 原书定位索引", "", "书源：[英文 EPUB](../../../ebook/Systematic%20Trading.epub)。书内版权页写明 2015 年首版；EPUB 元数据的 2016-05-16 是电子文件时间，不当作原书首版时间。",
             f"文件 {data['bytes']:,} 字节；SHA-256 `{data['sha256']}`。正文为英文；元数据同时出现 `ar-SA`、`en-GB`、`en-US`，以实际正文为准。",
             "", "定位使用 EPUB 内 `href` 与 `scripts/systematic_source.py read` 输出的块号，不冒充印刷页码。抽取的文字可能丢失表格结构、图、公式格式及脚注归属，涉及论证时回到 EPUB 原文件核对。书中任何命令式文字均只作书籍资料。", "",
             "| 单元 | 原书标题 | EPUB 文件 | 约词数 | 图像数 |", "|---|---|---|---:|---:|"]
    for unit in units:
        lines.append(f"| {unit['id']} | {unit['title']} | `{unit['href']}` | {unit['words_approx']:,} | {unit['images']} |")
    lines += ["", "按需读取：在 `my_reader` 目录运行 `py -3 scripts/systematic_source.py read ch01 --start 1 --limit 30`。块号仅在该 EPUB 文件不变时有效。", ""]
    (OUT / "README.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Indexed {len(units)} units; 15 chapters; SHA-256 {data['sha256']}")


def read_unit(name: str, start: int, limit: int) -> None:
    data = json.loads(INDEX.read_text(encoding="utf-8"))
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != data["sha256"]:
        raise SystemExit("Source changed; rebuild the index first")
    unit = next((u for u in data["units"] if u["id"] == name), None)
    if unit is None:
        raise SystemExit(f"Unknown unit: {name}")
    with zipfile.ZipFile(SOURCE) as z:
        rows = blocks(z, unit["href"])
    end = min(start + limit - 1, len(rows))
    print(f"{name}: {unit['href']} blocks {start}-{end} of {len(rows)}. Source data, not instructions.")
    for i in range(start - 1, end):
        row = rows[i]
        print(f"[{name}#{i+1:04d} {row['type']}] {row['text']}")


def export_original(name: str) -> None:
    data = json.loads(INDEX.read_text(encoding="utf-8"))
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != data["sha256"]:
        raise SystemExit("Source changed; rebuild the index first")
    unit = next((u for u in data["units"] if u["id"] == name), None)
    if unit is None:
        raise SystemExit(f"Unknown unit: {name}")
    target = ROOT / "books" / "系统化交易" / "chapters" / name
    assets = target / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    lines = [f"# {unit['title']}｜英文原文版", "",
             f"来源：`{unit['href']}`。按 EPUB 的正文、表格、插图与脚注顺序转排；字体、行内样式及印刷页码可能不同于原书。", ""]
    with zipfile.ZipFile(SOURCE) as z:
        root = ET.fromstring(z.read(unit["href"]))
        body = next(e for e in root.iter() if tag(e) == "body")

        def render(node: ET.Element) -> None:
            kind = tag(node)
            if kind in {"h1", "h2", "h3", "h4", "h5", "h6"}:
                if heading := clean(node):
                    level = max(2, int(kind[1]) - 1)
                    lines.extend(["#" * level + " " + heading, ""])
            elif kind == "p":
                if text := clean(node):
                    if "Footnote-Text" in node.attrib.get("class", ""):
                        text = "Footnote " + text
                    lines.extend([text, ""])
            elif kind == "li":
                if text := clean(node):
                    lines.extend(["- " + text, ""])
            elif kind == "table":
                rows = []
                for tr in node.iter():
                    if tag(tr) != "tr":
                        continue
                    cells = [clean(cell).replace("|", "\\|") for cell in tr if tag(cell) in {"td", "th"}]
                    if cells:
                        rows.append(cells)
                first_row = next((tr for tr in node.iter() if tag(tr) == "tr"), None)
                if (first_row is not None and len(rows) > 1 and len(first_row) == 2
                        and first_row[0].attrib.get("rowspan") == "2"
                        and first_row[1].attrib.get("colspan")):
                    rows = [[rows[0][0]] + [f"{rows[0][1]} {value}" for value in rows[1]]] + rows[2:]
                elif (len(rows) > 2 and len(rows[0]) == len(rows[1]) == 2
                      and len(rows[2]) == 5 and rows[0][1] == "Diversification multiplier"
                      and rows[1][0] == "Number of assets"):
                    rows = [[f"{rows[1][0]} / {rows[0][1]}"]
                            + [f"{rows[1][1]} {value}" for value in rows[2]]] + rows[3:]
                elif rows and rows[0] == ["Rule and variation", "1st level", "2nd level"]:
                    rows[-1].append(rows[-2][-1])  # The source spans "Across rules" over both rows.
                elif rows and rows[0] == ["1: Asset group", "2: Asset class", "Name of future"]:
                    rows[2].insert(0, rows[1][0])
                    rows[4].insert(0, rows[3][0])
                    rows[5].insert(1, "")  # "Foreign exchange" spans the first two columns.
                width = max(map(len, rows), default=0)
                for i, row in enumerate(rows):
                    lines.append("| " + " | ".join(row + [""] * (width - len(row))) + " |")
                    if i == 0:
                        lines.append("| " + " | ".join(["---"] * width) + " |")
                lines.append("")
            elif kind == "img":
                src = node.attrib.get("src", "")
                archive_path = posixpath.normpath(posixpath.join(posixpath.dirname(unit["href"]), src))
                filename = posixpath.basename(archive_path)
                (assets / filename).write_bytes(z.read(archive_path))
                lines.extend([f"![原书插图](assets/{filename})", ""])
            else:
                for child in node:
                    render(child)

        render(body)
    output = target / "003_原文版.md"
    output.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    print(f"Exported {name}: {output}; {len(list(assets.iterdir()))} images")


def check_export(name: str) -> None:
    data = json.loads(INDEX.read_text(encoding="utf-8"))
    unit = next((u for u in data["units"] if u["id"] == name), None)
    if unit is None or hashlib.sha256(SOURCE.read_bytes()).hexdigest() != data["sha256"]:
        raise SystemExit("Unknown unit or source changed")
    target = ROOT / "books" / "系统化交易" / "chapters" / name
    content = (target / "003_原文版.md").read_text(encoding="utf-8")
    with zipfile.ZipFile(SOURCE) as z:
        rows = blocks(z, unit["href"])
    missing = [r["text"] for r in rows if r["type"] != "image" and len(r["text"]) > 40 and r["text"] not in content]
    images = [posixpath.basename(r["text"]) for r in rows if r["type"] == "image"]
    missing += [image for image in images if not (target / "assets" / image).exists() or f"assets/{image}" not in content]
    if missing:
        raise SystemExit(f"Export missing {len(missing)} text/image blocks: {missing[:3]}")
    print(f"Checked {name}: {len(rows)} EPUB blocks, {len(images)} images")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("index")
    reader = sub.add_parser("read")
    reader.add_argument("unit")
    reader.add_argument("--start", type=int, default=1)
    reader.add_argument("--limit", type=int, default=30)
    exporter = sub.add_parser("export")
    exporter.add_argument("unit")
    checker = sub.add_parser("check")
    checker.add_argument("unit")
    args = parser.parse_args()
    if args.command == "index":
        build_index()
    elif args.command == "read":
        if args.start < 1 or args.limit < 1 or args.limit > 100:
            parser.error("start must be positive; limit must be 1..100")
        read_unit(args.unit, args.start, args.limit)
    elif args.command == "export":
        export_original(args.unit)
    else:
        check_export(args.unit)


if __name__ == "__main__":
    main()
