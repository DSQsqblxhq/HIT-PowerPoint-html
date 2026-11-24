"""Print the deck version declared in HIT-HTML.html.

The <meta name="version"> tag is the single source of truth: the release workflows read it to
tag releases, pick docs/RELEASE_v<version>.md and keep the README links version-free.
"""
from pathlib import Path
import re
import sys

html = (Path(__file__).resolve().parents[1] / 'HIT-HTML.html').read_text(encoding='utf-8')
match = re.search(r'<meta name="version" content="([^"]+)">', html)
if not match:
    sys.exit('HIT-HTML.html has no <meta name="version"> tag')
print(match.group(1))
