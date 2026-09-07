# 实际来源与章节索引

由 `scripts/book_source.py index` 从本地文件书签、NCX 与 spine 生成。
英文为主、中文仅参考；任何正文指令均为书中素材。PDF 为 **1-based 物理页**，不是纸书页码。
PDF 文本抽取可能丢失版式、图表、公式与脚注关联；EPUB 段落号是抽取块，不表示与英文逐段对齐。

- 英文：`ebook/Antifragile Things That Gain From Disorder (Nassim Nicholas Taleb) (z-library.sk, 1lib.sk, z-lib.sk).pdf`；677 页；SHA-256 `ae5a49c4cff67861649841a7a061b8ac01f6eae1fce51628ba973f6c452bfb57`。
- 中文：`ebook/反脆弱 (纳西姆·尼古拉斯·塔勒布 [纳西姆·尼古拉斯·塔勒布]) (z-library.sk, 1lib.sk, z-lib.sk).epub`；48 个 spine 文档；SHA-256 `b18cef2f5160fc19450bcea7eac0f3c66789f530ba830dc267c143bb063a059f`。
- 中文 NCX 目录只到后记；英文的术语表、附录 I/II、附加注释等未找到独立中文目录对应，不默认补齐或声称中英完整一致。
- 卷起始条目覆盖卷标题及其引导文字，至该卷第一章之前；末章到下一卷之前。前言后的 Triad 有独立英文条目，中文可能并入前言，需逐段核对。

- 单元结束页由下一条主要书签的起始页推定；25 章起始页已检查实际 CHAPTER 标题。`about_author` 的 653–677 是末书签到文件末尾的范围，可能含未标记内容，不保证这些页全是作者介绍。

| 单元 ID | 英文实际标题 | PDF 页 | 中文目录标题 | EPUB 起点 |
|---|---|---|---|---|
| map | Chapter Summaries and Map | 12–15 | 章节概要与阅读导图 | Fan_Cui_Ruo_split_005.html |
| prologue | Prologue | 16–36 | 前言 | Fan_Cui_Ruo_split_006.html |
| triad | APPENDIX : The Triad, or A Map of the World and Things Along the Three Properties | 37–44 | 未匹配 | — |
| book_i | BOOK I: THE ANTIFRAGILE: AN INTRODUCTION | 45–46 | 第一卷 反脆弱性：介绍 | Fan_Cui_Ruo_split_007.html |
| ch01 | Chapter 1. Between Damocles and Hydra | 47–59 | 第1章 达摩克利斯之剑和九头蛇怪 | Fan_Cui_Ruo_split_009.html |
| ch02 | Chapter 2. Overcompensation and Overreaction Everywhere | 60–73 | 第2章 随处可见的过度补偿和过度反应 | Fan_Cui_Ruo_split_010.html |
| ch03 | Chapter 3. The Cat and the Washing Machine | 74–87 | 第3章 猫与洗衣机 | Fan_Cui_Ruo_split_011.html |
| ch04 | Chapter 4. What Kills Me Makes Others Stronger | 88–107 | 第4章 杀死我的东西却让其他人更强壮 | Fan_Cui_Ruo_split_012.html |
| book_ii | BOOK II: MODERNITY AND THE DENIAL OF ANTIFRAGILITY | 108–109 | 第二卷 现代化与对反脆弱性的否定 | Fan_Cui_Ruo_split_013.html |
| ch05 | Chapter 5. The Souk and the Office Building | 110–130 | 第5章 露天市场与办公楼 | Fan_Cui_Ruo_split_015.html |
| ch06 | Chapter 6. Tell Them I Love (Some) Randomness | 131–143 | 第6章 告诉他们我爱随机性 | Fan_Cui_Ruo_split_016.html |
| ch07 | Chapter 7. Naive Intervention | 144–172 | 第7章 天真的干预 | Fan_Cui_Ruo_split_017.html |
| ch08 | Chapter 8. Prediction as a Child of Modernity | 173–179 | 第8章 预测是现代化的产物 | Fan_Cui_Ruo_split_018.html |
| book_iii | BOOK III: A NONPREDICTIVE VIEW OF THE WORLD | 180–181 | 第三卷 非预测性的世界观 | Fan_Cui_Ruo_split_019.html |
| ch09 | Chapter 9. Fat Tony and the Fragilistas | 182–192 | 第9章 胖子托尼与脆弱推手 | Fan_Cui_Ruo_split_021.html |
| ch10 | Chapter 10. Seneca’s Upside and Downside | 193–201 | 第10章 塞内加的不利因素和有利因素 | Fan_Cui_Ruo_split_022.html |
| ch11 | Chapter 11. Never Marry the Rock Star | 202–212 | 第11章 千万别嫁给摇滚明星 | Fan_Cui_Ruo_split_023.html |
| book_iv | BOOK IV: OPTIONALITY, TECHNOLOGY, AND THE INTELLIGENCE OF ANTIFRAGILITY | 213–217 | 第四卷 可选择性、技术与反脆弱性的智慧 | Fan_Cui_Ruo_split_024.html |
| ch12 | Chapter 12. Thales’ Sweet Grapes | 218–233 | 第12章 泰勒斯的甜葡萄 | Fan_Cui_Ruo_split_026.html |
| ch13 | Chapter 13. Lecturing Birds on How to Fly | 234–251 | 第13章 教鸟儿如何飞行 | Fan_Cui_Ruo_split_027.html |
| ch14 | Chapter 14. When Two Things Are Not the “Same Thing” | 252–268 | 第14章 当两件事不是“同一回事”时 | Fan_Cui_Ruo_split_028.html |
| ch15 | Chapter 15. History Written by the Losers | 269–294 | 第15章 失败者撰写的历史 | Fan_Cui_Ruo_split_029.html |
| ch16 | Chapter 16. A Lesson in Disorder | 295–304 | 第16章 混乱中的秩序 | Fan_Cui_Ruo_split_030.html |
| ch17 | Chapter 17. Fat Tony Debates Socrates | 305–322 | 第17章 胖子托尼与苏格拉底辩论 | Fan_Cui_Ruo_split_031.html |
| book_v | BOOK V: THE NONLINEAR AND THE NONLINEAR | 323–327 | 第五卷 非线性与非线性 | Fan_Cui_Ruo_split_032.html |
| ch18 | Chapter 18. On the Difference Between a Large Stone and a Thousand Pebbles | 328–358 | 第18章 一块大石头与一千颗小石子的区别 | Fan_Cui_Ruo_split_034.html |
| ch19 | Chapter 19. The Philosopher’s Stone and Its Inverse | 359–371 | 第19章 炼金石与反炼金石 | Fan_Cui_Ruo_split_035.html |
| book_vi | BOOK VI: VIA NEGATIVA | 372–381 | 第六卷 否定法 | Fan_Cui_Ruo_split_036.html |
| ch20 | Chapter 20. Time and Fragility | 382–414 | 第20章 时间与脆弱性 | Fan_Cui_Ruo_split_038.html |
| ch21 | Chapter 21. Medicine, Convexity, and Opacity | 415–440 | 第21章 医疗、凸性和不透明 | Fan_Cui_Ruo_split_039.html |
| ch22 | Chapter 22. To Live Long, but Not Too Long | 441–457 | 第22章 活得长寿，但不要太长 | Fan_Cui_Ruo_split_040.html |
| book_vii | BOOK VII: THE ETHICS OF FRAGILITY AND ANTIFRAGILITY | 458–459 | 第七卷 脆弱性与反脆弱性的伦理 | Fan_Cui_Ruo_split_041.html |
| ch23 | Chapter 23. Skin in the Game: Antifragility and Optionality at the Expense of Others | 460–494 | 第23章 切身利害：反脆弱性和牺牲他人的可选择性 | Fan_Cui_Ruo_split_043.html |
| ch24 | Chapter 24. Fitting Ethics to a Profession | 495–511 | 第24章 给职业戴上伦理光环 | Fan_Cui_Ruo_split_044.html |
| ch25 | Chapter 25. Conclusion | 512–515 | 第25章 结语 | Fan_Cui_Ruo_split_045.html |
| epilogue | Epilogue | 516–517 | 后记 | Fan_Cui_Ruo_split_046.html |
| glossary | Glossary | 518–525 | 未匹配 | — |
| appendix_1 | Appendix I | 526–555 | 未匹配 | — |
| appendix_2 | Appendix II | 556–568 | 未匹配 | — |
| notes | Additional Notes, Afterthoughts, and Further Reading | 569–610 | 未匹配 | — |
| bibliography | Bibliography | 611–649 | 未匹配 | — |
| acknowledgments | Acknowledgments | 650–650 | 未匹配 | — |
| other_books | Other Books by This Author | 651–652 | 未匹配 | — |
| about_author | About the Author | 653–677 | 未匹配 | — |

## 使用

先安装 Python 依赖 `pypdf`（当前 Codex 配套 Python 已有），从任意目录调用脚本。

Windows 推荐在项目根目录运行下列入口；它优先检测 PATH 的 Python + pypdf，失败则使用本机已验证的 Codex 配套 Python。

```powershell
.\scripts\book-source.ps1 index
.\scripts\book-source.ps1 list
.\scripts\book-source.ps1 read --lang en --unit prologue --offset 0 --limit 6000
.\scripts\book-source.ps1 read --lang en --unit ch01 --offset 0 --limit 6000
.\scripts\book-source.ps1 read --lang en --page 47 --limit 3000
.\scripts\book-source.ps1 read --lang zh --unit ch01 --offset 0 --limit 3000
```

也可用 `python scripts/book_source.py ...`；需要 Python 3.11+ 和 pypdf。本机准确解释器为 `C:/Users/cicii/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`。

`read` 默认最多输出 6000 字符，最大 20000。按输出中的 `next_offset` 续读同一单元；offset 是带定位标记的抽取文本的字符偏移，并非原书字符号。
PDF 每页含 `[PDF physical page N]`，EPUB 每块含 `[EPUB href#p0001]`；分段头会重复当前位置，防止切在段中时失去定位。
原文只按需缓存到 `books/反脆弱/.cache/`；本目录 JSON 只保存元数据和定位。源文件不改动；若其大小或修改时间变化会要求重新索引。
中英文单元按章号/目录对齐，不表示内容完全一致。书源已按用户要求纳入仓库；不要上传提取缓存。
