# 来源、致谢与第三方说明

整理日期：2026-09-16。本文记录当前已知来源；不会将未核实的作者、素材来源或许可补写为已确认事实。

## 1. HTML 版本

- 版本名称：HIT-HTML。
- 项目仓库：[DSQsqblxhq/HIT-PowerPoint-html](https://github.com/DSQsqblxhq/HIT-PowerPoint-html)。
- 整理与维护：[DSQsqblxhq](https://github.com/DSQsqblxhq)。
- 本次整理以维护者提供的 `HIT-HTML.html` 为基础，补充仓库文档、来源注释及参考示例许可原文。
- 演示页内容、版式、内嵌资源和放映脚本保持与所提供 HTML 一致。

## 2. PPT 模板参考

- 项目：[yhao-z/HIT-PowerPoint](https://github.com/yhao-z/HIT-PowerPoint)。
- 当前维护者：[yhao-z](https://github.com/yhao-z)。
- 参考内容：哈工大学术汇报模板的视觉风格和版式。
- 上游来源说明：[README](https://github.com/yhao-z/HIT-PowerPoint/blob/main/README.md)。

上游 README 说明，该 PPT 基于哈工大 PPT 大赛的“三生万物”模板制作，并添加少量内容；原公众号链接已失效，当前维护者尚未联系到原模板作者。本项目沿用这一来源记录，不将当前维护者标注为原始模板的唯一作者。

所提供 HTML 的原始注释中还出现了 `HIT-HTML.pptx`，这是制作过程中的参考文件名。本次整理没有附带或重新分发该 PPTX 文件，不将其视为额外的独立授权依据。

### 沟通记录

- [issue #2：HTML 版本贡献咨询](https://github.com/yhao-z/HIT-PowerPoint/issues/2)。
- [维护者支持独立仓库及介绍链接 PR，并要求保留来源](https://github.com/yhao-z/HIT-PowerPoint/issues/2#issuecomment-5681949255)。
- [维护者再次支持独立维护或合入原仓库](https://github.com/yhao-z/HIT-PowerPoint/issues/2#issuecomment-5682013558)。

这些回复记录当前维护者的支持意见，不代表最初 PPT 作者或其他素材权利人对全部内容授予统一开源许可。截至整理日期，原 PPT 仓库根目录未见独立 LICENSE，README 也未给出统一开源许可证。

## 3. Open Design 参考示例

- 项目：[nexu-io/open-design](https://github.com/nexu-io/open-design)。
- 示例：[fs-notebook-tabs](https://github.com/nexu-io/open-design/tree/main/plugins/_official/examples/fs-notebook-tabs)。
- 本 HTML 原始注释标明的参考范围：固定画布、键盘、滚轮、触摸及 hash 页面导航等放映交互。
- 示例目录的独立许可：[MIT License](https://github.com/nexu-io/open-design/blob/main/plugins/_official/examples/fs-notebook-tabs/LICENSE)。
- 该许可的版权署名：Copyright (c) 2025 Zara Zhang。
- 核实的许可文件 Git blob SHA：`746da6896f2da755b5b54987b4f29a7eea1320b5`。

该示例目录拥有独立 MIT 许可，不能仅根据 Open Design 仓库根目录的 Apache-2.0 许可判断示例的许可。为保留参考实现的署名和许可信息，本仓库附上 [MIT 原文](../licenses/open-design-fs-notebook-tabs-MIT.txt)，并在 HTML 注释中保留相同许可。

这里引用的 MIT 许可仅对应相关上游参考内容，不表示 HIT-HTML 的全部代码、PPT 版式、字体或学校标识统一采用 MIT。

## 4. 内嵌字形与学校相关图形

| 项目 | 当前文件中的实现与可核实信息 |
| --- | --- |
| 建筑标志 | `brand-header` 模板中的内联 SVG；原始 `desc` 说明其为根据参考图片重建的图形。未随文件提供原始参考图片的确切 URL 或独立许可。 |
| 中文校名、英文校名及校训 | `HITLettering` / 原注释所称 `HIT Reference Lettering`，以 WOFF2 data URI 内嵌；用于固定文字，并非通用中文字库。未随文件提供完整制作来源或独立许可。 |
| 正文字体 | CSS 引用系统字体回退列表，未随项目打包对应系统字体文件。 |

上述标识和固定字形不因转为 SVG、WOFF2 或嵌入 HTML 而自动获得新的授权。本项目不声称拥有学校名称、标识或上游字形的全部权利，也不代表学校官方认可或背书。

## 5. 许可范围与补充方式

本仓库暂不声明覆盖全部内容的统一开源许可证。上游已有明确许可证的部分按各自许可证处理；来源或授权仍待补充的内容，不以“已注明来源”代替许可，也不因从其他许可中排除而自动获得分发授权。

若需要对外分发修改版，请保留相关署名、来源和已有许可，并核实所使用设计与素材的适用授权。若某项素材授权无法确认，可以获取权利人的明确许可，或替换为来源和授权清楚的素材。

欢迎相关权利人通过仓库 Issue 补充原始链接、作者署名或授权依据；维护者可据此修订说明并处理相关内容。
