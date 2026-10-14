<div align="center">

# HIT-PowerPoint-html

**哈尔滨工业大学学术汇报 HTML 模板**

[点击预览](https://dsqsqblxhq.github.io/HIT-PowerPoint-html/HIT-HTML.html) · [下载文件](https://github.com/DSQsqblxhq/HIT-PowerPoint-html/releases/download/v1.2/HIT-HTML.html)

![License](https://img.shields.io/badge/license-MIT-blue.svg)

本项目为个人整理，与哈尔滨工业大学官方发布渠道无隶属关系。原 PPT 及其他参考资料的来源、署名和许可范围见 [来源与第三方说明](docs/THIRD_PARTY_NOTICES.md)。

</div>

## 预览

<table>
  <tr>
    <td align="center">
      <a href="https://dsqsqblxhq.github.io/HIT-PowerPoint-html/HIT-HTML.html#/0">
        <img src="docs/screenshots/cover.png" alt="封面页" width="480">
      </a>
      <br>
      <sub>封面页</sub>
    </td>
    <td align="center">
      <a href="https://dsqsqblxhq.github.io/HIT-PowerPoint-html/HIT-HTML.html#/6">
        <img src="docs/screenshots/ending.png" alt="结尾页" width="480">
      </a>
      <br>
      <sub>结尾页</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://dsqsqblxhq.github.io/HIT-PowerPoint-html/HIT-HTML.html#/7">
        <img src="docs/screenshots/master.png" alt="母版页" width="480">
      </a>
      <br>
      <sub>母版页</sub>
    </td>
    <td align="center">
      <a href="https://dsqsqblxhq.github.io/HIT-PowerPoint-html/HIT-HTML.html?role=presenter#/3">
        <img src="docs/screenshots/presenter.png" alt="演讲者工作台" width="480">
      </a>
      <br>
      <sub>演讲者工作台</sub>
    </td>
  </tr>
</table>

## 快速开始

- **在线预览**：直接访问 [HIT-PowerPoint-html](https://dsqsqblxhq.github.io/HIT-PowerPoint-html/HIT-HTML.html)。
- **本地使用**：下载[HIT-HTML.html](https://github.com/DSQsqblxhq/HIT-PowerPoint-html/releases/download/v1.2/HIT-HTML.html)，用浏览器打开。
- **编辑模板**：用文本编辑器修改标题、正文、讲稿，保存后刷新浏览器。

日常使用可以只修改 HTML 文件，转交或再分发时请同时保留相关来源与许可说明。


## 功能

| 功能 | 说明 |
|------|------|
| 单文件离线放映 | 样式、脚本、SVG 资源全部内嵌 |
| 16:9 固定画布 | 1920×1080，自动缩放 |
| 8 页初始模板 | 封面、目录、章节页、正文、双栏、表格、结束页、空白母版 |
| 演讲者工作台 | 当前页、下一页预览、逐页讲稿、字号调节及可调整的卡片布局 |
| 双屏同步 | 演讲者与观众窗口同步翻页，支持选择播放屏幕 |
| 幻灯片总览 | 查看所有页面的缩略图，点击跳转 |
| 排练计时 | 全程与本页计时，支持开始、暂停、继续、重置 |
| 打印样式 | 可通过浏览器打印或另存为 PDF |


## 操作速查

| 操作 | 按键或入口 |
| --- | --- |
| 下一页 | `→` / `↓` / `PageDown` / 空格 |
| 上一页 | `←` / `↑` / `PageUp` |
| 第一页 / 最后一页 | `Home` / `End` |
| 全屏 / 退出全屏 | `F` 或底部“全屏”按钮 |
| 演讲者模式 | `S` 或底部“演讲者”按钮 |
| 幻灯片总览 | `G` 或“总览”按钮；普通放映与观众窗口也可按 `O` |
| 打开观众窗口 | 工作台中的“打开播放窗”按钮或 `O` |
| 重置计时 | 工作台中的“重置”按钮或 `R` |
| 关闭总览 / 退出工作台 | `Esc`，优先关闭已打开的总览 |
| 打印 / 导出 PDF | 底部“打印”按钮 |

将鼠标移至窗口底部可显示放映控制栏，触屏横向滑动可翻页。观众窗口保留翻页、总览和全屏按钮。

进入演讲者模式时，当前窗口显示工作台，观众窗口在屏幕权限询问结束后打开。双屏使用时将系统显示设为“扩展”，在工作台选择播放屏幕；也可手动把观众窗口拖到副屏，再点击“全屏”。若浏览器拦截弹窗，允许后点击“打开播放窗”。工作台中的 `F` 或“副屏全屏”按钮会请求观众窗口进入全屏。

计时在观众窗口首次进入全屏时自动开始，也可手动控制；翻页会重新计算本页时间，全程计时继续累计。刷新工作台或观众窗口可恢复同一放映会话及计时状态。拖动卡片标题或右下角可调整布局，“重置布局”恢复默认排布。

## 修改模板

主要编辑位置：

| 内容 | HTML 中的位置 |
| --- | --- |
| 题目、姓名、单位和日期 | 封面的 `cover-meta`、封面与结束页的标题 |
| 页面正文 | 各个 `section.slide` |
| 章节名称和跳转页码 | `CONFIG.sections` |
| 页面所属章节 | `data-section` 属性 |
| 逐页讲稿和建议时长 | `NOTES` 数组 |
| 主色、画布尺寸和正文字体 | `:root` 中的 CSS 变量 |

复制、删除或移动页面后，请同步检查 `CONFIG.sections` 的目标页码及 `NOTES` 的条目顺序。初始第 8 页为空白母版，会进入打印结果；正式汇报前可删除不用的页面。

完整编辑说明见 [使用指南](docs/USAGE.md)。模板中的文字、人员信息和实验数据均为占位内容，请替换后使用。

## 来源与许可

- 灵感来源：[yhao-z/HIT-PowerPoint](https://github.com/yhao-z/HIT-PowerPoint)
- 本仓库代码（HTML/CSS/JS）：[MIT](./LICENSE)
- 第三方代码与素材：
  - `fs-notebook-tabs` 组件：MIT 许可证，详见 [licenses/open-design-fs-notebook-tabs-MIT.txt](./licenses/open-design-fs-notebook-tabs-MIT.txt)

原 PPT 仓库注明其模板基于哈工大 PPT 大赛的“三生万物”模板制作，原作者身份及原始公众号链接尚未补全。
本项目保留该来源记录，并感谢原模板作者、yhao-z 和 Open Design 相关贡献者。

本仓库暂不对全部文件声明统一开源许可证。随附 MIT 许可仅对应 Open Design 的 `fs-notebook-tabs` 参考示例，不扩展至 PPT 设计、学校标识、字形素材或本项目全部内容。
各项具体说明见 [THIRD_PARTY_NOTICES.md](docs/THIRD_PARTY_NOTICES.md)。

如果你是相关作品的权利人，或掌握原始作者及授权资料，欢迎通过仓库 Issue 补充，便于完善署名和使用说明。
