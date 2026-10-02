#!/usr/bin/env python3
"""Index and read bounded passages from the supplied Thinking, Fast and Slow EPUB."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

from book_source import epub_blocks, epub_info

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "books" / "思考，快与慢"
INDEX = BOOK / "sources" / "source_index.json"


def source_file() -> Path:
    found = list(BOOK.glob("*.epub"))
    if len(found) != 1:
        raise ValueError(f"Expected one EPUB in {BOOK}, found {len(found)}")
    return found[0]


def fingerprint(path: Path) -> dict:
    stat = path.stat()
    with path.open("rb") as handle:
        digest = hashlib.file_digest(handle, "sha256").hexdigest()
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": stat.st_size,
            "mtime_ns": stat.st_mtime_ns, "sha256": digest}


def index() -> None:
    path = source_file()
    info = epub_info(path)
    units = []
    for entry in info["toc"]:
        match = re.match(r"^(\d+)\.\s+(.+)$", entry["title"])
        if not match:
            continue
        href = entry["href"].split("#", 1)[0]
        if href not in info["spine"]:
            raise ValueError(f"Chapter is missing from EPUB spine: {href}")
        units.append({"id": f"ch{int(match[1]):02d}", "title": match[2],
                      "epub_href": href, "toc_href": entry["href"]})
    if [x["id"] for x in units] != [f"ch{i:02d}" for i in range(1, 39)]:
        raise ValueError("Unexpected chapter sequence; inspect EPUB TOC before proceeding")
    data = {"schema_version": 1, "source": fingerprint(path), "units": units,
            "location_note": "EPUB extraction blocks and offsets are not print pages; check XHTML for figures and notes."}
    INDEX.parent.mkdir(parents=True, exist_ok=True)
    INDEX.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    rows = ["# 《思考，快与慢》书源索引", "", f"英文主源：`{data['source']['path']}`。",
            f"SHA-256：`{data['source']['sha256']}`。", "中文 MOBI 仅供可选术语对照。",
            "EPUB 章节 href 和抽取块不是印刷页码；图表、脚注和公式须检查 XHTML。", "",
            "| 单元 | 英文章名 | EPUB 起点 |", "|---|---|---|"]
    rows += [f"| {x['id']} | {x['title']} | `{x['toc_href']}` |" for x in units]
    rows += ["", "## 读取", "", "在仓库根目录运行：", "",
             "```powershell", "python scripts/thinking_source.py index",
             "python scripts/thinking_source.py list",
             "python scripts/thinking_source.py read --unit ch01 --offset 0 --limit 6000", "```", "",
             "读取结果的 offset 是带定位标记的抽取字符位置，只在同一单元内有效。", ""]
    (INDEX.parent / "README.md").write_text("\n".join(rows), encoding="utf-8")
    print(f"Indexed {len(units)} chapters from {path.name}")


def load_index() -> dict:
    if not INDEX.exists():
        raise ValueError("No index; run: python scripts/thinking_source.py index")
    data = json.loads(INDEX.read_text(encoding="utf-8"))
    path = ROOT / data["source"]["path"]
    stat = path.stat()
    if stat.st_size != data["source"]["bytes"] or stat.st_mtime_ns != data["source"]["mtime_ns"]:
        raise ValueError("EPUB changed; rebuild the index")
    return data


def read(args: argparse.Namespace) -> None:
    if args.offset < 0 or not 1 <= args.limit <= 20000:
        raise ValueError("offset must be >= 0 and limit must be 1..20000")
    data = load_index()
    unit = next((x for x in data["units"] if x["id"] == args.unit), None)
    if unit is None:
        raise ValueError(f"Unknown unit: {args.unit}")
    with zipfile.ZipFile(ROOT / data["source"]["path"]) as archive:
        blocks = epub_blocks(archive, unit["epub_href"])
    stream = ""
    anchors = []
    for number, block in enumerate(blocks, 1):
        anchors.append((len(stream), f"{unit['epub_href']}#p{number:04d}"))
        stream += f"\n[EPUB {anchors[-1][1]}]\n{block}\n"
    if args.offset > len(stream):
        raise ValueError(f"offset exceeds unit length ({len(stream)})")
    end = min(args.offset + args.limit, len(stream))
    active = next((name for position, name in reversed(anchors) if position <= args.offset), None)
    print(json.dumps({"source": data["source"]["path"], "sha256": data["source"]["sha256"],
                      "unit": args.unit, "offset": args.offset, "end_offset": end,
                      "total_chars": len(stream), "next_offset": end if end < len(stream) else None,
                      "start_location": active}, ensure_ascii=False))
    print(stream[args.offset:end])


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("index")
    commands.add_parser("list")
    passage = commands.add_parser("read")
    passage.add_argument("--unit", required=True)
    passage.add_argument("--offset", type=int, default=0)
    passage.add_argument("--limit", type=int, default=6000)
    args = parser.parse_args()
    try:
        if args.command == "index":
            index()
        elif args.command == "list":
            for unit in load_index()["units"]:
                print(f"{unit['id']}  {unit['title']}  {unit['toc_href']}")
        else:
            read(args)
    except (ValueError, OSError, KeyError, zipfile.BadZipFile) as exc:
        parser.exit(1, f"Error: {exc}\n")


if __name__ == "__main__":
    main()
