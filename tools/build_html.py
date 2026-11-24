"""Regenerate the minified engine assets embedded in HIT-HTML.html.

HIT-HTML.html stays the single deliverable and the source of truth for content
(slides, CONFIG, NOTES). The engine itself lives in readable form under src/:

    src/deck.css            -> <style data-hit-style="theme">
    src/deck-presenter.css  -> <style data-hit-style="presenter">
    src/deck-workbench.js   -> the minified tail of the deck <script>

`python tools/build_html.py` rewrites those three blocks in place.
`python tools/build_html.py --check` verifies the committed HTML is in sync and
is what CI runs, so hand-editing a minified block is caught instead of shipped.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / 'HIT-HTML.html'

# The two regions package_local.py must keep byte-stable so the CMD stays editable.
EDITABLE = (
    r'(/\* === 可编辑章节配置：[\s\S]*?\*/\r?\nconst CONFIG=.*?;\r?\n'
    r'|/\* === 可编辑逐页讲稿：[\s\S]*?\*/\r?\nconst NOTES=\[[\s\S]*?\r?\n\];)'
)

STYLE_SOURCES = (
    ('theme', 'src/deck.css'),
    ('presenter', 'src/deck-presenter.css'),
)
ENGINE_SOURCE = 'src/deck-workbench.js'

WS = ' \t\n\r\f\v\u00a0'
REGEX_PREV_PUNCT = set('(,=:[!&|?{};+-*%<>~^/')
REGEX_PREV_WORDS = {
    'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
    'throw', 'case', 'do', 'else', 'yield', 'await',
}
MULTI_OPS = (
    '>>>=', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=',
    '...', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--',
    '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '**', '<<', '>>',
)
NUMBER_RE = re.compile(
    r'(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+'
    r'|\d[\d_]*\.?[\d_]*(?:[eE][+-]?\d+)?|\.\d[\d_]*(?:[eE][+-]?\d+)?)[nN]?'
)
WORD_RE = re.compile(r'[A-Za-z_$\u0080-\uffff][\w$\u0080-\uffff]*')


def _is_word_char(ch):
    return ch.isalnum() or ch in '_$' or ord(ch) > 127


def _need_space(left, right):
    """Minimal whitespace that still keeps two adjacent tokens apart."""
    if not left or not right:
        return False
    a, b = left[-1], right[0]
    if _is_word_char(a) and _is_word_char(b):
        return True
    if a == '+' and b == '+':
        return True
    if a == '-' and b == '-':
        return True
    if a == '/' and b in '/*':
        return True
    if a == '<' and b == '!':
        return True
    if a.isdigit() and b == '.':
        return True
    return False


def _strip_edges(src):
    start, end = 0, len(src)
    while start < end and src[start] in WS:
        start += 1
    while end > start and src[end - 1] in WS:
        end -= 1
    return src[start:end]


def tokenize_js(src):
    """Tokens that matter for whitespace decisions: ws, comments, strings, regex, templates."""
    tokens = []
    i, n = 0, len(src)
    prev = None
    while i < n:
        c = src[i]
        if c in WS:
            j = i
            while j < n and src[j] in WS:
                j += 1
            tokens.append(('ws', src[i:j]))
            i = j
            continue
        if src.startswith('//', i):
            j = src.find('\n', i)
            j = n if j < 0 else j
            tokens.append(('comment', src[i:j]))
            i = j
            continue
        if src.startswith('/*', i):
            j = src.find('*/', i + 2)
            j = n if j < 0 else j + 2
            tokens.append(('comment', src[i:j]))
            i = j
            continue
        if c in '"\'':
            j = i + 1
            while j < n:
                if src[j] == '\\':
                    j += 2
                    continue
                if src[j] == c:
                    j += 1
                    break
                j += 1
            tokens.append(('string', src[i:j]))
            i = j
            prev = 'x'
            continue
        if c == '`':
            j = i + 1
            depth = 0
            while j < n:
                if src[j] == '\\':
                    j += 2
                    continue
                if depth == 0 and src[j] == '`':
                    j += 1
                    break
                if src.startswith('${', j):
                    depth += 1
                    j += 2
                    continue
                if src[j] == '}' and depth:
                    depth -= 1
                    j += 1
                    continue
                j += 1
            tokens.append(('template', src[i:j]))
            i = j
            prev = 'x'
            continue
        if c == '/' and (prev is None or prev in REGEX_PREV_PUNCT or prev in REGEX_PREV_WORDS):
            j = i + 1
            in_class = False
            closed = False
            while j < n:
                ch = src[j]
                if ch == '\\':
                    j += 2
                    continue
                if ch == '\n':
                    break
                if in_class:
                    if ch == ']':
                        in_class = False
                elif ch == '[':
                    in_class = True
                elif ch == '/':
                    j += 1
                    closed = True
                    break
                j += 1
            if not closed:
                tokens.append(('punct', '/'))
                i += 1
                prev = '/'
                continue
            while j < n and src[j].isalpha():
                j += 1
            tokens.append(('regex', src[i:j]))
            i = j
            prev = 'x'
            continue
        if c.isdigit() or (c == '.' and i + 1 < n and src[i + 1].isdigit()):
            m = NUMBER_RE.match(src, i)
            tokens.append(('number', m.group(0)))
            i = m.end()
            prev = 'x'
            continue
        m = WORD_RE.match(src, i)
        if m:
            tokens.append(('word', m.group(0)))
            prev = m.group(0)
            i = m.end()
            continue
        for op in MULTI_OPS:
            if src.startswith(op, i):
                tokens.append(('punct', op))
                prev = op
                i += len(op)
                break
        else:
            tokens.append(('punct', c))
            prev = c
            i += 1
    return tokens


def minify_js(src):
    """Collapse whitespace; comments are not allowed in minified regions."""
    out = []
    prev = None
    for kind, text in tokenize_js(_strip_edges(src)):
        if kind == 'ws':
            continue
        if kind == 'comment':
            raise SystemExit(
                'src/deck-workbench.js must not contain comments; keep them in '
                'HIT-HTML.html (readable) instead: %r' % text[:40]
            )
        if _need_space(prev, text):
            out.append(' ')
        out.append(text)
        prev = text
    return ''.join(out)


CSS_TOKEN_RE = re.compile(
    r'(?P<ws>\s+)'
    r'|(?P<str>"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\')'
    r'|(?P<url>url\((?:[^()\\]|\\.|\([^()]*\))*\))'
    r'|(?P<other>.)',
    re.S,
)
# Whitespace next to these characters is never significant in CSS values.
CSS_DROP_BEFORE = set('{};,:)>~!')
CSS_DROP_AFTER = set('{};,:(>~!')


def minify_css(src):
    out = []
    pending_ws = False
    prev = None
    for m in CSS_TOKEN_RE.finditer(_strip_edges(src)):
        kind, text = m.lastgroup, m.group(0)
        if kind == 'ws':
            pending_ws = True
            continue
        if pending_ws:
            if prev is not None and prev[-1] not in CSS_DROP_AFTER and text[0] not in CSS_DROP_BEFORE:
                out.append(' ')
            pending_ws = False
        out.append(text)
        prev = text
    return ''.join(out)


_STYLE_RE = re.compile(r'<style\b[^>]*\bdata-hit-style="([a-z-]+)"[^>]*>([\s\S]*?)</style>')
_SCRIPT_RE = re.compile(r'(<script\b[^>]*>)([\s\S]*?)(</script>)')


def _read(path):
    # newline='' keeps CRLF intact; the file is byte-compared, not reformatted.
    with open(path, 'r', encoding='utf-8', newline='') as handle:
        return handle.read()


def _source(name):
    return _read(ROOT / name)


def build(html):
    """Return html with every engine block replaced by the minified src/ version."""
    # Follow the checked-out file's line endings: CRLF on Windows, LF elsewhere.
    newline = '\r\n' if '\r\n' in html else '\n'
    for name, source in STYLE_SOURCES:
        css = minify_css(_source(source))
        pattern = re.compile(
            r'(<style\b[^>]*\bdata-hit-style="%s"[^>]*>)([\s\S]*?)(</style>)' % re.escape(name)
        )
        if len(pattern.findall(html)) != 1:
            raise SystemExit('expected exactly one <style data-hit-style="%s"> block' % name)
        html = pattern.sub(lambda m: m.group(1) + css + m.group(3), html)

    found = []

    def rewrite_script(match):
        body = match.group(2)
        if 'const CONFIG=' not in body or 'const NOTES=' not in body:
            return match.group(0)
        parts = re.split(EDITABLE, body)
        if len(parts) != 5:
            raise SystemExit('CONFIG/NOTES regions in the deck script changed shape (expected 5 parts)')
        engine = minify_js(_source(ENGINE_SOURCE))
        found.append(True)
        return (match.group(1) + ''.join(parts[:4])
                + newline + engine + newline + match.group(3))

    html = _SCRIPT_RE.sub(rewrite_script, html)
    if not found:
        raise SystemExit('could not find the deck script (const CONFIG=/const NOTES=)')
    return html


def main(argv):
    check = '--check' in argv
    current = _read(HTML_PATH)
    updated = build(current)
    if check:
        if updated == current:
            print('HIT-HTML.html is in sync with src/')
            return 0
        at = next((i for i, (a, b) in enumerate(zip(current, updated)) if a != b), min(len(current), len(updated)))
        print('HIT-HTML.html is OUT OF SYNC with src/ (first difference at char %d)' % at)
        print('run `python tools/build_html.py` and commit the result')
        return 1
    if updated != current:
        HTML_PATH.write_bytes(updated.encode('utf-8'))
        print('rewrote HIT-HTML.html (%d -> %d bytes)' % (len(current.encode('utf-8')), len(updated.encode('utf-8'))))
    else:
        print('HIT-HTML.html already up to date')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
