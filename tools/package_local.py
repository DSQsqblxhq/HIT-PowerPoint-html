"""Build one CMD; pack fixed assets in memory and keep slide content/notes editable."""
from pathlib import Path
import base64
import gzip
import re

root = Path(__file__).resolve().parents[1]
output = root / 'dist' / 'HIT-HTML-local.cmd'
bootstrap = r'''@echo off
setlocal DisableDelayedExpansion
set "HIT_PRESENTATION_SELF=%~f0"
if not defined HIT_PRESENTATION_POWERSHELL set "HIT_PRESENTATION_POWERSHELL=powershell.exe"
set "POWERSHELL_TELEMETRY_OPTOUT=1"
set "POWERSHELL_UPDATECHECK=Off"
"%HIT_PRESENTATION_POWERSHELL%" -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$s=[IO.File]::ReadAllText($env:HIT_PRESENTATION_SELF,[Text.Encoding]::UTF8);$m=[regex]::Match($s,'(?s)\r?\n# === HIT LOCAL START ===\r?\n(.*?)\r?\n# === HIT LOCAL END ===(?:\r?\n|$)');if(-not $m.Success){throw 'Invalid HIT launcher'};& ([scriptblock]::Create($m.Groups[1].Value))"
if errorlevel 1 pause
exit /b
'''
script = (root / 'tools/local/Start-Presentation.ps1').read_text(encoding='utf-8-sig').rstrip('\r\n')
intro = '''HIT HTML 单文件本地双屏放映（Windows）
双击本文件即可启动，不需要其他文件、Python、管理员权限或公网连接。
请使用新版 Edge / Chrome，将系统显示设为扩展，并允许本机地址的屏幕管理请求。
首页在选中此 CMD 的资源管理器所在屏幕以普通窗口打开；未找到对应窗口时使用鼠标所在屏幕。点击“演讲者”并允许屏幕管理权限后，观众页面默认在所选副屏全屏。
演示期间保持启动窗口打开；结束时在终端按 Q 或 Esc，一并关闭放映窗口与本地服务，无需输入 Y。
启动器使用专用 Edge / Chrome 窗口，在该配置中为本机演示地址启用自动全屏和弹窗；屏幕管理权限仍需允许，权限与布局在本机保存。
编辑：在文件末尾的 HTML 区域修改页面文字、CONFIG 章节和 NOTES 讲稿。
固定资源以 HIT-GZIP 注释保存，启动时在内存中还原；保留这些标记和启动代码。
按 UTF-8 保存后刷新即可；样式及脚本可修改独立 HTML 后重新构建 CMD。
服务仅监听 127.0.0.1，HTML 在内存中还原，不解压临时 HTML；浏览器配置保存在本机应用数据目录。
'''
notices = [intro]
html = (root / 'HIT-HTML.html').read_bytes().decode('utf-8')
# Their complete licenses already appear in the HTML; verify before omitting duplicate copies.
normalize = lambda text: re.sub(r'\s+', ' ', text).strip()
for name in ['open-design-fs-notebook-tabs-MIT.txt', 'html-ppt-skill-MIT.txt']:
    license_text = (root / 'licenses' / name).read_text(encoding='utf-8').strip()
    if normalize(license_text) not in normalize(html):
        notices.append('\n===== licenses/' + name + ' =====\n' + license_text)
for name in ['LICENSE', 'docs/THIRD_PARTY_NOTICES.md']:
    notices.append('\n===== ' + name + ' =====\n' + (root / name).read_text(encoding='utf-8'))
prefix = (bootstrap + '# === HIT LOCAL START ===\n' + script +
          '\n# === HIT LOCAL END ===\n\n' + '\n'.join(notices) +
          '\n<!-- === HIT HTML START === -->\n')
output.parent.mkdir(exist_ok=True)
def pack_asset(text):
    raw = text.encode('utf-8')
    data = bytearray(gzip.compress(raw, compresslevel=9, mtime=0))
    data[9] = 255  # Normalize the gzip OS byte across Python 3.11-3.14.
    marker = '<!--HIT-GZIP:' + base64.b64encode(data).decode('ascii') + '-->'
    return marker if len(marker.encode('ascii')) + 64 < len(raw) else text


def pack_block(match):
    text = match.group(0)
    if text.startswith('<script') and 'const CONFIG=' in text and 'const NOTES=' in text:
        opening = text.index('>') + 1
        body = text[opening:-9]
        editable = r'(/\* === 可编辑章节配置：[\s\S]*?\*/\r?\nconst CONFIG=.*?;\r?\n|/\* === 可编辑逐页讲稿：[\s\S]*?\*/\r?\nconst NOTES=\[[\s\S]*?\r?\n\];)'
        parts = re.split(editable, body)
        if len(parts) != 5:
            raise ValueError('CONFIG and NOTES must stay directly editable')
        return text[:opening] + ''.join(part if i % 2 else pack_asset(part) for i, part in enumerate(parts)) + '</script>'
    return pack_asset(text)


packed_html = re.sub(r'<style\b[^>]*>[\s\S]*?</style>|<svg\b[^>]*>[\s\S]*?</svg>|<script\b[^>]*>[\s\S]*?</script>', pack_block, html)
# Only the ASCII bootstrap requires CRLF; retain the editable HTML's existing line endings.
payload = prefix.replace('\r\n', '\n').replace('\n', '\r\n').encode('utf-8') + packed_html.encode('utf-8')
output.write_bytes(payload)
print(output)
