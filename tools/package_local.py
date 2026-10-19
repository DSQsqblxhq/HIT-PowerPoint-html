"""Build a single editable CMD containing the server, HTML and license notices."""
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
output = root / 'dist' / 'HIT-HTML-local.cmd'
bootstrap = r'''@echo off
setlocal DisableDelayedExpansion
set "HIT_PRESENTATION_SELF=%~f0"
if not defined HIT_PRESENTATION_POWERSHELL set "HIT_PRESENTATION_POWERSHELL=powershell.exe"
"%HIT_PRESENTATION_POWERSHELL%" -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$s=[IO.File]::ReadAllText($env:HIT_PRESENTATION_SELF,[Text.Encoding]::UTF8);$m=[regex]::Match($s,'(?s)\r?\n# === HIT LOCAL START ===\r?\n(.*?)\r?\n# === HIT LOCAL END ===(?:\r?\n|$)');if(-not $m.Success){throw 'Invalid HIT launcher'};& ([scriptblock]::Create($m.Groups[1].Value))"
if errorlevel 1 pause
exit /b
'''
script = (root / 'tools/local/Start-Presentation.ps1').read_text(encoding='utf-8-sig').rstrip('\r\n')
intro = '''HIT HTML 单文件本地双屏放映（Windows）
双击本文件即可启动，不需要其他文件、Python、管理员权限或公网连接。
请使用新版 Edge / Chrome，将系统显示设为扩展，并允许本机地址的屏幕管理请求。
演示期间保持启动窗口打开，结束后按 Ctrl+C 关闭。
编辑：用文本编辑器打开本文件，在末尾找到 <!doctype html>，修改 HTML 内容。
保留启动代码和标记行，按 UTF-8 保存，刷新浏览器即可看到修改。
服务仅监听 127.0.0.1，仅提供本文件内嵌的 HTML，不会解压或生成其他文件。
'''
notices = [intro]
for name in ['LICENSE', 'docs/THIRD_PARTY_NOTICES.md',
             'licenses/open-design-fs-notebook-tabs-MIT.txt', 'licenses/html-ppt-skill-MIT.txt']:
    notices.append('\n===== ' + name + ' =====\n' + (root / name).read_text(encoding='utf-8'))
prefix = (bootstrap + '# === HIT LOCAL START ===\n' + script +
          '\n# === HIT LOCAL END ===\n\n' + '\n'.join(notices) +
          '\n<!-- === HIT HTML START === -->\n')
output.parent.mkdir(exist_ok=True)
# CMD bootstrap needs CRLF; preserve the original HTML bytes for exact rendering and editing.
payload = prefix.replace('\r\n', '\n').replace('\n', '\r\n').encode('utf-8') + (root / 'HIT-HTML.html').read_bytes()
output.write_bytes(payload)
print(output)
# Keep the previous download URL useful; its ZIP now contains only the same single CMD.
archive = output.with_name('HIT-HTML-local-v1.2.zip')
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
    entry = zipfile.ZipInfo(output.name, date_time=(2026, 10, 19, 0, 0, 0))
    entry.compress_type = zipfile.ZIP_DEFLATED
    entry.external_attr = 0o100644 << 16
    bundle.writestr(entry, payload, compresslevel=9)
print(archive)
