"""Index the supplied EPUB and export selected articles to the local reader."""

import hashlib
import json
import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EPUB = next(path for path in (ROOT / "ebook").glob("*.epub") if "毛泽东选集" in path.name)
BOOK = ROOT / "books" / "毛泽东选集"
SELECTED = {
    "0205", "0215", "0216", "0309", "0402", "0407", "0413",
    "0559", "0651", "0658", "0748",
}
SUMMARY_OVERRIDES = {
    "0205": "针对照搬书本和指示的工作方式，论证调查应先于结论，并说明调查会、中心问题与记录方法。",
    "0215": "从实践取得感性材料，形成理性认识，再用实践检验和修正认识；批评经验主义与教条主义。",
    "0216": "讨论矛盾的普遍性和特殊性、主要矛盾与主要方面，以及条件变化下的转化。",
    "0309": "比较中日双方多项条件，反驳亡国与速胜两论，推演防御、相持、反攻及相应的动员和战法。",
    "0402": "批评不研究现实和历史、只背理论的学习方式，主张以中国实际问题组织调查和理论研究。",
    "0407": "以八项问题批评空话、吓人、不看对象、语言干瘪和机械分条等文风，强调写作责任。",
    "0413": "说明一般号召与个别指导、领导骨干与群众意见怎样结合，并通过试点经验改进工作。",
    "0559": "列出党委协作十二项方法，涉及公开讨论、互通信息、请教基层、抓重点、算数量与团结异议者。",
    "0651": "以十组关系思考经济、地区、个人、中央地方及对外学习等建设中的资源配置与协调。",
    "0658": "区分不同性质的社会矛盾，讨论内部冲突的处理方式及经济、文化、民族等十二类具体问题。",
    "0748": "把认识概括为实践材料形成思想、思想回到实践检验的反复过程；是农村工作决定草案的节选。",
}
NS = {"n": "http://www.daisy.org/z3986/2005/ncx/"}


def clean(value):
    return re.sub(r"\s+", " ", value).strip().replace("|", "｜")


def content_parts(data):
    root = ET.fromstring(data)
    body = root.find("{http://www.w3.org/1999/xhtml}body")
    parts = []
    for node in body.iter():
        kind = node.tag.rsplit("}", 1)[-1]
        if kind in {"h3", "h4", "h5", "p", "blockquote"}:
            value = clean("".join(node.itertext()))
            if value:
                parts.append((kind, value))
    return parts


def abstract(parts):
    prose = [text for kind, text in parts if kind == "p" and len(text) > 35]
    if not prose:
        return "正文较短；参看原书中的题目、日期与全文。"
    opening = re.split(r"(?<=[。！？])", prose[0])
    lead = ""
    for sentence in opening:
        lead += sentence
        if len(lead) >= 60:
            break
    lead = lead.strip()
    if len(lead) > 130:
        lead = lead[:127].rstrip("，、； ") + "……"
    headings = [text for kind, text in parts if kind == "h4" and "注释" not in text]
    if headings:
        return f"{lead} 分节涉及：{'、'.join(headings[:4])}{'等' if len(headings) > 4 else ''}。"
    return lead


def main():
    BOOK.mkdir(parents=True, exist_ok=True)
    catalog_path = BOOK / "目录.json"
    existing = {item["chapterId"]: item for item in json.loads(catalog_path.read_text(encoding="utf-8"))} if catalog_path.exists() else {}
    with zipfile.ZipFile(EPUB) as archive:
        toc = ET.fromstring(archive.read("OEBPS/toc.ncx"))
        nav = toc.find("n:navMap", NS)
        articles = []
        for volume_number, volume in enumerate(nav.findall("n:navPoint", NS), 1):
            for section in volume.findall("n:navPoint", NS):
                for item in section.findall("n:navPoint", NS):
                    title = clean(item.findtext("n:navLabel/n:text", namespaces=NS))
                    source = item.find("n:content", NS).attrib["src"]
                    section_id = re.search(r"Section(\d+)\.xhtml", source).group(1)
                    parts = content_parts(archive.read("OEBPS/" + source))
                    date = next((text for kind, text in parts if kind == "p" and re.match(r"^[（(]一[九零○〇二三四五六七八九十0-9]", text)), "")
                    prior = existing.get("a" + section_id, {})
                    record = {
                        "number": len(articles) + 1,
                        "volume": volume_number,
                        "chapterId": "a" + section_id,
                        "title": title,
                        "date": date,
                        "source": "OEBPS/" + source,
                        "summary": prior.get("summary", SUMMARY_OVERRIDES.get(section_id, abstract(parts))),
                        "selected": prior.get("selected", section_id in SELECTED),
                    }
                    if prior.get("group"):
                        record["group"] = prior["group"]
                    articles.append(record)
                    if record["selected"]:
                        folder = BOOK / "chapters" / record["chapterId"]
                        folder.mkdir(parents=True, exist_ok=True)
                        output = folder / "003_原文版.md"
                        if output.exists():
                            continue
                        lines = [f"# {title}", "", f"原书定位：EPUB `{record['source']}`。以下按本 EPUB 正文顺序转录；原注保留。", ""]
                        for kind, text in parts:
                            if kind == "h3":
                                continue
                            if kind in {"h4", "h5"}:
                                lines += ["## " + text, ""]
                            else:
                                lines += [text, ""]
                        output.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    assert len(articles) == 387 and sum(item["selected"] for item in articles) >= len(SELECTED)
    catalog_path.write_text(json.dumps(articles, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = ["# 《毛泽东选集》七卷全篇索引", "", f"书源：`{EPUB.name}`；SHA-256：`{hashlib.sha256(EPUB.read_bytes()).hexdigest()}`。", "", "共 387 篇正文。下表的内容线索提取自各篇正文开头和分节标题，供导航；精读时须重读全文。第六、七卷在本 EPUB 标为‘静火版’，版本性质与前五卷不同，待逐篇核对出处。✅ 为已开放，○ 为保留目录。", ""]
    for volume in range(1, 8):
        lines += [f"## 第{volume}卷", "", "| 序号 | 篇目与日期 | 内容线索 | EPUB 定位 |", "| ---: | --- | --- | --- |"]
        for item in (item for item in articles if item["volume"] == volume):
            title = item["title"]
            status = "✅" if item["selected"] else "○"
            date = item["date"].replace("|", "｜")
            lines.append(f"| {item['number']} | {status} {title}<br>{date} | {item['summary']} | `{item['source']}` |")
        lines.append("")
    (BOOK / "全篇索引.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Indexed {len(articles)} articles; {sum(item['selected'] for item in articles)} selected.")


if __name__ == "__main__":
    main()
