<div align="center">

# HIT-PowerPoint-html

**哈尔滨工业大学学术汇报 HTML 模板**

[点击预览](https://dsqsqblxhq.github.io/HIT-PowerPoint-html/HIT-HTML.html) · [下载 HTML](https://github.com/DSQsqblxhq/HIT-PowerPoint-html/releases/download/v1.2/HIT-HTML.html) · [本地双屏单文件](https://github.com/DSQsqblxhq/HIT-PowerPoint-html/releases/download/v1.2/HIT-HTML-local.cmd)

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
- **本地自动双屏（Windows）**：只需下载并双击 [HIT-HTML-local.cmd](https://github.com/DSQsqblxhq/HIT-PowerPoint-html/releases/download/v1.2/HIT-HTML-local.cmd)，在打开的 Edge / Chrome 中允许屏幕管理权限。HTML、启动代码与许可全部内嵌，不需要其他文件、联网、Python 或管理员权限；演示期间保持启动窗口打开，结束时切回终端按 `Q`（无需回车），会一并关闭工作台、观众窗口和本地服务，也可按 `Esc` 或 `Ctrl+C`，无需输入 `Y`。
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
| 双屏互换 | 工作台或观众底栏均可交换两个窗口的角色，接续当前页、计时、讲稿字号和布局 |
| 本地双屏启动 | Windows 一键通过本机地址打开本地 HTML，独立申请屏幕管理权限 |
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
| 双屏互换 | 工作台顶部或观众底栏的“双屏互换”按钮 |
| 重置计时 | 工作台中的“重置”按钮或 `R` |
| 关闭总览 / 退出工作台 | `Esc`，优先关闭已打开的总览 |
| 打印 / 导出 PDF | 底部“打印”按钮 |

将鼠标移至窗口底部可显示放映控制栏，触屏横向滑动可翻页。观众窗口保留翻页、总览、双屏互换和全屏按钮。

进入演讲者模式时，当前窗口显示工作台，观众窗口在屏幕权限询问结束后打开。双屏使用时将系统显示设为“扩展”，在工作台选择播放屏幕；也可手动把观众窗口拖到副屏。随后在工作台点击“副屏全屏”或按 `F`，即可让观众窗口全屏，无需切换窗口操作。若浏览器拦截弹窗，允许后点击“打开播放窗”。全屏请求失败时，工作台会显示原因并允许重试。

连接两个窗口后，点击任一端的“双屏互换”，现有两个窗口会交换工作台与观众角色；页码、运行或暂停的计时、讲稿字号和卡片布局一起交接。原观众窗口全屏时会退出全屏并显示工作台，新的观众窗口接续全屏；若浏览器拒绝自动全屏，可在新工作台点击“副屏全屏”重试。互换过程中按钮暂时禁用，完成后可再次互换。普通主页面底栏仍按“演讲者、总览、全屏、打印”排列。

直接打开本地 HTML 时，若互换后再刷新工作台，浏览器可能限制跨窗全屏授权；此时在观众窗口点击“全屏”，或改用 `HIT-HTML-local.cmd`。

在线网页、直接双击的 `file://` 文件与本机地址的屏幕权限分别管理。若在线版能自动打开副屏而本地 HTML 不能，请使用单文件 `HIT-HTML-local.cmd`：它仅在 `127.0.0.1` 提供内嵌 HTML，首次使用需要单独允许该地址的屏幕管理请求。默认地址为 `http://127.0.0.1:8765/HIT-HTML.html`，端口占用时自动顺延。直接打开 HTML 能否自动跨屏仍取决于浏览器的本地文件权限；未取得权限时工作台会提示原因。

CMD 启动首页会在选中该文件的资源管理器所在屏幕以普通窗口打开，不沿用浏览器上次保存的位置或全屏状态；未找到对应资源管理器窗口时，使用启动时鼠标所在屏幕。CMD 会在专用浏览器配置中为本机演示地址启用自动全屏和弹窗，避免授权或加载等待后失去点击触发条件。点击“演讲者”并允许屏幕管理权限后，观众页面默认在所选副屏全屏，工作台保持窗口显示。

CMD 使用专用的 Edge / Chrome 放映窗口，浏览器配置保存在 `%LOCALAPPDATA%\HIT-HTML`，首次需要允许屏幕管理权限，同一文件和地址下的授权与布局可保留。终端退出只关闭本次演示的浏览器进程；手动复制地址打开的页面需自行关闭。

单文件 CMD 可直接编辑页面文字、`CONFIG` 章节和 `NOTES` 讲稿，按 UTF-8 保存后刷新浏览器。固定 SVG、样式和运行脚本以 `HIT-GZIP` 注释压缩，启动器在内存中还原，不生成额外 HTML 文件；请保留这些注释和启动标记。需要修改固定资源时，编辑独立 HTML 并重新构建 CMD。单个 `.html` 无法自行启动本机服务，因此自动本地双屏版本使用 `.cmd` 扩展名。

本地 HTML 在任一窗口刷新后，可能需要重新连接播放窗口。看到重连提示后，再在工作台点击一次“副屏全屏”或按 `F` 即可，当前页与计时会保留。

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
- 演讲者模式参考：[lewislulu/html-ppt-skill](https://github.com/lewislulu/html-ppt-skill)，包括工作台布局、当前页与下一页预览、讲稿、计时及双窗口同步放映等交互。
- 本仓库代码（HTML/CSS/JS）：[MIT](./LICENSE)
- 第三方代码与素材：
  - `fs-notebook-tabs` 组件：MIT 许可证，详见 [licenses/open-design-fs-notebook-tabs-MIT.txt](./licenses/open-design-fs-notebook-tabs-MIT.txt)
  - `html-ppt-skill` 演讲者模式参考：MIT 许可证，作者 lewis，详见 [licenses/html-ppt-skill-MIT.txt](./licenses/html-ppt-skill-MIT.txt)

原 PPT 仓库注明其模板基于哈工大 PPT 大赛的“三生万物”模板制作，原作者身份及原始公众号链接尚未补全。
本项目保留该来源记录，并感谢原模板作者、yhao-z、Open Design 相关贡献者及 html-ppt-skill 作者 lewis。

本仓库暂不对全部文件声明统一开源许可证。随附第三方 MIT 许可分别对应 Open Design 的 `fs-notebook-tabs` 参考示例及 `html-ppt-skill` 演讲者模式参考内容，不扩展至 PPT 设计、学校标识、字形素材或本项目全部内容。
各项具体说明见 [THIRD_PARTY_NOTICES.md](docs/THIRD_PARTY_NOTICES.md)。

如果你是相关作品的权利人，或掌握原始作者及授权资料，欢迎通过仓库 Issue 补充，便于完善署名和使用说明。

