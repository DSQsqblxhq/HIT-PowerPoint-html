# HIT-HTML v1.3.1

- 放映时用条件请求核对模板样式，内容未变时服务器返回 304，翻页不再重复下载整份 HTML。
- 本地 CMD：编辑器改动或标记损坏时显示可修复的提示页并继续放映，不再因此结束放映；浏览器关闭试探连接也不会中断服务；15 秒内未能定位放映窗口时给出回退提示。
- 引擎源码：样式与工作台脚本移至 `src/` 可读源码，`python tools/build_html.py` 生成 HTML；发布前校验 HTML 与源码一致，并对 CMD 做解码回环校验。
- 测试与发布：新增文档结构、打印导出与本地启动器容错测试，CI 在 PR 上运行；版本号以 HTML 的 `<meta name="version">` 为唯一来源，README 下载链接固定指向 latest。

下载 `HIT-HTML.html` 直接打开，或下载 `HIT-HTML-local.cmd` 在 Windows 使用本地自动双屏放映。
