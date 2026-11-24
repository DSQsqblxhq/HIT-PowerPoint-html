"""Build one CMD; pack fixed assets in memory and keep slide content/notes editable."""
from pathlib import Path
import base64
import gzip
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_html import EDITABLE  # noqa: E402  (single definition of the editable regions)

root = Path(__file__).resolve().parents[1]
output = root / 'dist' / 'HIT-HTML-local.cmd'
launcher_source = root / 'tools/local/Start-Presentation.ps1'

# The asset marker format is shared with the launcher. Both sides use this exact regex, so
# a change on one side would ship a CMD that only fails at launch; assert they still agree.
MARKER_PREFIX = '<!--HIT-GZIP:'
MARKER_SUFFIX = '-->'
MARKER_RE = r'<!--HIT-GZIP:([A-Za-z0-9+/=]+)-->'
LAUNCHER_MARKER_RE = r'<!--HIT-PS:([A-Za-z0-9+/=]+)-->'
REGION_MARKER = '<!-- === HIT HTML START === -->'

# The launcher script travels inside the file as a HIT-PS marker: the bootstrap inflates it in
# memory and runs it, so the batch file stays a single compact download.
bootstrap = r'''@echo off
setlocal DisableDelayedExpansion
set "HIT_PRESENTATION_SELF=%~f0"
if not defined HIT_PRESENTATION_POWERSHELL set "HIT_PRESENTATION_POWERSHELL=powershell.exe"
set "POWERSHELL_TELEMETRY_OPTOUT=1"
set "POWERSHELL_UPDATECHECK=Off"
"%HIT_PRESENTATION_POWERSHELL%" -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop';$s=[IO.File]::ReadAllText($env:HIT_PRESENTATION_SELF,[Text.Encoding]::UTF8);$m=[regex]::Match($s,'(?s)\r?\n# === HIT LOCAL START ===\r?\n<!--HIT-PS:([A-Za-z0-9+/=]+)-->\r?\n# === HIT LOCAL END ===(?:\r?\n|$)');if(-not $m.Success){throw 'Invalid HIT launcher'};$g=[IO.Compression.GZipStream]::new([IO.MemoryStream]::new([Convert]::FromBase64String($m.Groups[1].Value)),[IO.Compression.CompressionMode]::Decompress);$r=[IO.StreamReader]::new($g,[Text.Encoding]::UTF8);$t=$r.ReadToEnd();$r.Dispose();$g.Dispose();& ([scriptblock]::Create($t))"
if errorlevel 1 pause
exit /b
'''
script = launcher_source.read_text(encoding='utf-8-sig').rstrip('\r\n')
intro = '''HIT HTML 单文件本地双屏放映（Windows）
双击本文件即可启动，不需要其他文件、Python、管理员权限或公网连接。
请使用新版 Edge / Chrome，将系统显示设为扩展，并允许本机地址的屏幕管理请求。
终端和首页在选中此 CMD 的资源管理器所在屏幕打开；未找到对应窗口时使用鼠标所在屏幕。点击“演讲”并允许屏幕管理权限后，观众页面默认在所选副屏全屏。
演示期间保持启动窗口打开；结束时在终端按 Q 或 Esc，一并关闭放映窗口与本地服务，无需输入 Y。
启动器使用专用 Edge / Chrome 窗口，在该配置中为本机演示地址启用自动全屏和弹窗；屏幕管理权限仍需允许，权限与布局在本机保存。
编辑：在文件末尾的 HTML 区域修改页面文字、CONFIG 章节和 NOTES 讲稿；保存后刷新浏览器即可，页面读取失败会显示提示页而不是结束放映。
启动脚本以 HIT-PS 注释保存；样式、脚本与较大的 SVG 以 HIT-GZIP 注释压缩保存（极小的图形原样保留），启动时在内存中还原。请保留这些标记和启动代码。
样式及脚本的源码在仓库 src/ 中，修改后运行 python tools/build_html.py 重新生成 HTML，再构建 CMD。
服务仅监听 127.0.0.1，HTML 在内存中还原，不解压临时 HTML；浏览器配置保存在本机应用数据目录。
项目代码的 MIT 许可及上游许可见内嵌 HTML 开头；其他素材的来源与使用范围见下方第三方说明。
'''
notices = [intro]
html = (root / 'HIT-HTML.html').read_bytes().decode('utf-8')
project_license = (root / 'LICENSE').read_text(encoding='utf-8').rstrip('\n')
license_block = f'<!-- HIT-HTML project code license (repository LICENSE)\n{project_license}\n-->'
if html.replace('\r\n', '\n').count(license_block) != 1:
    raise ValueError('Update the HIT-HTML project license comment to match the repository LICENSE.')

# The embedded HTML carries the checked project license; only add missing upstream notices.
normalize = lambda text: re.sub(r'\s+', ' ', text).strip()
for name in ['open-design-fs-notebook-tabs-MIT.txt', 'html-ppt-skill-MIT.txt']:
    license_text = (root / 'licenses' / name).read_text(encoding='utf-8').strip()
    if normalize(license_text) not in normalize(html):
        notices.append('\n===== licenses/' + name + ' =====\n' + license_text)
notices.append('\n===== docs/THIRD_PARTY_NOTICES.md =====\n' +
               (root / 'docs/THIRD_PARTY_NOTICES.md').read_text(encoding='utf-8'))


def gzip_payload(data):
    """Deterministic gzip of UTF-8 text (fixed mtime and OS byte)."""
    raw = bytearray(gzip.compress(data.encode('utf-8'), compresslevel=9, mtime=0))
    raw[9] = 255  # Normalize the gzip OS byte across Python 3.11-3.14.
    return base64.b64encode(bytes(raw)).decode('ascii')


def gunzip_payload(payload):
    return gzip.decompress(base64.b64decode(payload)).decode('utf-8')


# The launcher must keep reading exactly what this script writes.
ps1_text = launcher_source.read_text(encoding='utf-8-sig')
for literal in (MARKER_RE, REGION_MARKER):
    if literal not in ps1_text:
        raise ValueError(f'tools/local/Start-Presentation.ps1 no longer contains {literal!r}; '
                         'update both sides together')
if LAUNCHER_MARKER_RE not in bootstrap:
    raise ValueError(f'the bootstrap must still match {LAUNCHER_MARKER_RE!r}')
if not launcher_source.read_bytes().startswith(b'\xef\xbb\xbf'):
    raise ValueError('tools/local/Start-Presentation.ps1 must keep its UTF-8 BOM: powershell.exe '
                     'would read the Chinese messages with the ANSI code page otherwise')

launcher_marker = '<!--HIT-PS:' + gzip_payload(script) + '-->'
prefix = (bootstrap + '# === HIT LOCAL START ===\n' + launcher_marker +
          '\n# === HIT LOCAL END ===\n\n' + '\n'.join(notices) +
          '\n' + REGION_MARKER + '\n')
output.parent.mkdir(exist_ok=True)

pack_stats = {'packed': 0, 'raw': 0}


def pack_asset(text):
    marker = MARKER_PREFIX + gzip_payload(text) + MARKER_SUFFIX
    if len(marker.encode('ascii')) + 64 < len(text.encode('utf-8')):
        pack_stats['packed'] += 1
        return marker
    pack_stats['raw'] += 1
    return text


def pack_block(match):
    text = match.group(0)
    if text.startswith('<script') and 'const CONFIG=' in text and 'const NOTES=' in text:
        opening = text.index('>') + 1
        body = text[opening:-9]
        parts = re.split(EDITABLE, body)
        if len(parts) != 5:
            raise ValueError('CONFIG and NOTES must stay directly editable')
        if not parts[0] or not parts[2] or not parts[4]:
            raise ValueError('the deck script must keep engine code around the editable regions')
        if not parts[1].startswith('/* === 可编辑章节配置') or not parts[3].startswith('/* === 可编辑逐页讲稿'):
            raise ValueError('CONFIG and NOTES regions must start with their documented comment')
        return text[:opening] + ''.join(part if i % 2 else pack_asset(part) for i, part in enumerate(parts)) + '</script>'
    return pack_asset(text)


packed_html = re.sub(r'<style\b[^>]*>[\s\S]*?</style>|<svg\b[^>]*>[\s\S]*?</svg>|<script\b[^>]*>[\s\S]*?</script>', pack_block, html)
# Only the ASCII bootstrap requires CRLF; retain the editable HTML's existing line endings.
payload = prefix.replace('\r\n', '\n').replace('\n', '\r\n').encode('utf-8') + packed_html.encode('utf-8')
output.write_bytes(payload)


def verify_built_cmd():
    """Decode the freshly written CMD the same way the launcher does."""
    raw = output.read_bytes()
    head, separator, tail = raw.partition(REGION_MARKER.encode('ascii'))
    if not separator:
        raise ValueError('the built CMD is missing the HTML region marker')
    if tail.startswith(b'\r\n'):
        tail = tail[2:]
    elif tail.startswith(b'\n'):
        tail = tail[1:]
    embedded = tail.decode('utf-8')
    if embedded != packed_html:
        raise ValueError('the embedded HTML region differs from the packed source')
    decoded = re.sub(MARKER_RE, lambda m: gunzip_payload(m.group(1)), embedded)
    if decoded != html:
        raise ValueError('decoding every HIT-GZIP marker did not reproduce HIT-HTML.html')
    if MARKER_PREFIX in decoded:
        raise ValueError('a HIT-GZIP marker survived decoding')
    launcher_match = re.search(r'<!--HIT-PS:([A-Za-z0-9+/=]+)-->', head.decode('ascii', 'replace'))
    if not launcher_match or gunzip_payload(launcher_match.group(1)) != script:
        raise ValueError('the embedded launcher script does not round-trip')
    return len(raw)


size = verify_built_cmd()
print(f'{output} ({size} bytes; {pack_stats["packed"]} blocks compressed, {pack_stats["raw"]} kept as text)')
