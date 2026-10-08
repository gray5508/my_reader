# 书源与定位

- 主源：[The Intelligent Investor.epub](The%20Intelligent%20Investor.epub)，从用户提供的 `F:/learn_resource/ebook/The Intelligent Investor (Graham, Benjamin) (z-library.sk, 1lib.sk, z-lib.sk).epub` 复制。
- SHA-256：`d5cc8bb3efefe5378b172fd4121ce82effef66bd439a81c52cd7f700778f80aa`；语言 `en`；EPUB 内 `content.opf` 与 `toc.ncx` 定义书序。
- 标题页称 *Revised Edition*；版权页写明格雷厄姆正文 ©1973、Zweig 新内容 ©2003、EPUB June 2003，eISBN 9780061745171。元数据 `dc:date=1949` 仅可作原版历史线索。

## 书序与源文件

| 顺序 | 内容 | EPUB XHTML |
| --- | --- | --- |
| 1 | 巴菲特第四版序言及 1976 年纪念文 | `OPS/xhtml/pre_split_000.xhtml`、`pre_split_001.xhtml` |
| 2 | Zweig 关于格雷厄姆的说明 | `OPS/xhtml/adc.xhtml` |
| 3 | 格雷厄姆导论、Zweig 导论评注 | `OPS/xhtml/int.xhtml`、`com.xhtml` |
| 4–23 | 第 1—20 章，各章正文与紧随的评注 | `OPS/xhtml/chapterN_split_000.xhtml`、`chapterN_split_001.xhtml`；逐章核实是否还有更多 split 文件 |
| 24 | 后记及 Zweig 评注 | `OPS/xhtml/bm.xhtml`、`bm1.xhtml` |
| 25 | 附录 1—7 | `OPS/xhtml/bm2.xhtml`，锚点 `#bm03`—`#bm09` |
| 后续 | 章末注、致谢、索引及出版资料 | `OPS/xhtml/notes_split_*.xhtml` 等；按正文引用和资料性质处理 |

目录标题与真实 spine 边界都要核对。脚注可能集中存于 `footnote.xhtml` 或 `notes_split_*.xhtml`，不能只因当前 XHTML 无脚注正文就说本章没有注。若正文或评注含图表，查图片文件与 alt/图注。源位置用 XHTML 路径、元素 id 或段落序号描述，不冒充印刷页码。
