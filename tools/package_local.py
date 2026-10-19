"""Build the offline Windows launcher bundle using only Python's standard library."""
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
output = root / 'dist' / 'HIT-HTML-local-v1.2.zip'
files = {
    'HIT-HTML.html': root / 'HIT-HTML.html',
    'LICENSE': root / 'LICENSE',
    'docs/THIRD_PARTY_NOTICES.md': root / 'docs/THIRD_PARTY_NOTICES.md',
}
for name in ('Start-Presentation.cmd', 'Start-Presentation.ps1', 'README-LOCAL.txt'):
    files[name] = root / 'tools' / 'local' / name
for source in sorted((root / 'licenses').glob('*.txt')):
    files['licenses/' + source.name] = source
if not list((root / 'licenses').glob('*.txt')):
    raise FileNotFoundError('Third-party licenses are required for distribution')
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
    for name, source in sorted(files.items()):
        entry = zipfile.ZipInfo(name, date_time=(2026, 10, 19, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        data = source.read_bytes()
        if name.endswith(('.cmd', '.ps1')):
            text = data.decode('utf-8-sig').replace('\r\n', '\n').replace('\n', '\r\n')
            data = text.encode('utf-8-sig' if name.endswith('.ps1') else 'ascii')
        bundle.writestr(entry, data, compresslevel=9)
print(output)
