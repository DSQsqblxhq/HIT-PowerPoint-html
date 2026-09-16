# HIT-PowerPoint-html

哈尔滨工业大学学术汇报 HTML 模板（HIT-HTML）。下载后在浏览器中打开即可放映，适用于组会、课程展示和论文答辩。

参考 [yhao-z/HIT-PowerPoint](https://github.com/yhao-z/HIT-PowerPoint) 的 PPT 模板制作，放映交互参考 [Open Design · fs-notebook-tabs](https://github.com/nexu-io/open-design/tree/main/plugins/_official/examples/fs-notebook-tabs)。HTML 版本由 [DSQsqblxhq](https://github.com/DSQsqblxhq) 整理与维护。

本项目为个人整理的模板，与哈尔滨工业大学官方发布渠道无隶属关系。原 PPT 及其他参考资料的来源、署名和许可范围见 [来源与第三方说明](THIRD_PARTY_NOTICES.md)。

## 快速开始

1. 点击本仓库的 **Code → Download ZIP**，解压文件。
2. 用浏览器打开 `HIT-HTML.html`，无须安装依赖或启动服务器。
3. 用文本编辑器修改标题、人员信息、页面正文及讲稿，保存后刷新浏览器。

GitHub 文件页面显示的是 HTML 源码；请下载文件后再打开。日常使用可以只携带 HTML 文件，转交或再分发时请同时保留相关来源与许可说明。

## 功能

- 单个 HTML 文件，样式、脚本、建筑标志 SVG 和固定校名字形资源内嵌，可离线放映。
- 1920 × 1080 固定画布，按窗口大小缩放，页面比例为 16:9。
- 8 页初始模板：封面、目录、章节页、正文、双栏、表格、结束页和空白母版。
- 自动目录、章节导航、页码和页面地址定位。
- 键盘、滚轮、触摸滑动及底部按钮翻页，全屏放映。
- 与当前页面同步的讲稿侧栏，支持建议时长、来源说明和引用文献。
- 全程排练计时，支持开始、暂停、继续和重置。
- 打印样式，可通过浏览器打印或另存为 PDF。

## 操作速查

| 操作 | 按键或入口 |
| --- | --- |
| 下一页 | `→` / `↓` / `PageDown` / 空格 |
| 上一页 | `←` / `↑` / `PageUp` |
| 第一页 / 最后一页 | `Home` / `End` |
| 全屏 / 退出全屏 | `F` 或底部“全屏”按钮 |
| 打开 / 关闭讲稿 | `N` 或底部“讲稿”按钮 |
| 关闭讲稿面板 | `Esc` 或面板“关闭”按钮 |
| 返回目录 | 底部“目录”按钮 |
| 打印 / 导出 PDF | 底部“打印”按钮 |

将鼠标移至窗口底部可显示放映控制栏。触屏横向滑动可翻页。关闭讲稿面板后，已开始的排练计时仍会继续；刷新页面会重置计时。

## 修改模板

主要编辑位置：

| 内容 | HTML 中的位置 |
| --- | --- |
| 题目、姓名、单位和日期 | 封面与结束页的 `cover-meta` 和标题 |
| 页面正文 | 各个 `section.slide` |
| 章节名称和跳转页码 | `CONFIG.sections` |
| 页面所属章节 | `data-section` 属性 |
| 逐页讲稿和建议时长 | `NOTES` 数组 |
| 主色、画布尺寸和正文字体 | `:root` 中的 CSS 变量 |

复制、删除或移动页面后，请同步检查 `CONFIG.sections` 的目标页码及 `NOTES` 的条目顺序。初始第 8 页为空白母版，会进入打印结果；正式汇报前可删除不用的页面。

完整编辑说明见 [使用指南](docs/USAGE.md)。模板中的文字、人员信息和实验数据均为占位内容，请替换后使用。

## 文件说明

| 文件 | 用途 |
| --- | --- |
| [HIT-HTML.html](HIT-HTML.html) | 可离线打开的演示模板 |
| [docs/USAGE.md](docs/USAGE.md) | 页面、章节、讲稿和 PDF 导出说明 |
| [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | 来源、致谢与许可范围 |
| [licenses/open-design-fs-notebook-tabs-MIT.txt](licenses/open-design-fs-notebook-tabs-MIT.txt) | Open Design 参考示例的 MIT 许可原文 |

## 来源与许可

原 PPT 仓库注明其模板基于哈工大 PPT 大赛的“三生万物”模板制作，原作者身份及原始公众号链接尚未补全。本项目保留该来源记录，并感谢原模板作者、yhao-z 和 Open Design 相关贡献者。

[上游 issue #2](https://github.com/yhao-z/HIT-PowerPoint/issues/2) 记录了当前维护者对 HTML 版本独立维护及提交介绍链接 PR 的支持。该沟通不代表原始 PPT 作者或学校对全部设计、字形和标识的统一许可。

本仓库暂不对全部文件声明统一开源许可证。随附 MIT 许可仅对应 Open Design 的 `fs-notebook-tabs` 参考示例，不扩展至 PPT 设计、学校标识、字形素材或本项目全部内容。各项具体说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

如果你是相关作品的权利人，或掌握原始作者及授权资料，欢迎通过仓库 Issue 补充，便于完善署名和使用说明。
