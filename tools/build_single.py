#!/usr/bin/env python3
"""build_single.py — 게임 전체를 HTML 파일 하나로 묶는다 (정적 호스팅/Artifact 배포용).

  python tools/build_single.py              # → dist/nyang-candy-factory.html
  python tools/build_single.py --fragment   # <html>/<head>/<body> 없이 (Artifact 게시용)

- src/*.js 모듈을 각각 함수로 감싸 이름 충돌 없이 한 <script>에 넣고
- style.css 를 인라인, assets/sprites/*.png 는 data URI 로 넣는다.
"""
import argparse
import base64
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER = ['sprites', 'characters', 'actor', 'audio', 'problems', 'game']  # 의존 순서

IMPORT_RE = re.compile(r"^import\s*\{([^}]*)\}\s*from\s*'\./(\w+)\.js';\s*$", re.M)
EXPORT_RE = re.compile(r"^export\s+(?:const|let|function|class)\s+(\w+)", re.M)


def read(*p):
    with open(os.path.join(ROOT, *p), encoding='utf-8') as f:
        return f.read()


def bundle_js():
    parts = []
    for name in ORDER:
        src = read('src', name + '.js')
        exports = EXPORT_RE.findall(src)
        src = IMPORT_RE.sub(lambda m: f"const {{{m.group(1)}}} = __mod_{m.group(2)};", src)
        src = re.sub(r"^export\s+", "", src, flags=re.M)
        if re.search(r"^\s*(import|export)\b", src, re.M):
            raise SystemExit(f'{name}.js: 처리하지 못한 import/export 가 있습니다')
        parts.append(f"// ── {name}.js ──\nconst __mod_{name} = (() => {{\n{src}\nreturn {{ {', '.join(exports)} }};\n}})();\n")
    return '\n'.join(parts)


def sprite_data():
    d = os.path.join(ROOT, 'assets', 'sprites')
    out = {}
    for fn in sorted(os.listdir(d)):
        if fn.endswith('.png'):
            with open(os.path.join(d, fn), 'rb') as f:
                out[fn] = 'data:image/png;base64,' + base64.b64encode(f.read()).decode()
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('-o', '--out', default=os.path.join(ROOT, 'dist', 'nyang-candy-factory.html'))
    ap.add_argument('--fragment', action='store_true', help='문서 뼈대 태그 없이 출력')
    args = ap.parse_args()

    html = read('index.html')
    head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
    body = re.search(r'<body>(.*?)</body>', html, re.S).group(1)
    head = re.sub(r'\s*<link rel="stylesheet" href="style.css[^"]*">', '', head)
    body = re.sub(r'\s*<!--[^>]*-->\s*<script type="importmap">.*?</script>', '', body, flags=re.S)
    body = re.sub(r'\s*<script type="module" src="src/game.js[^"]*"></script>', '', body)
    if args.fragment:  # 게시 쪽 뼈대가 charset/viewport 를 넣어 준다
        head = re.sub(r'\s*<meta (charset|name="viewport")[^>]*>', '', head)

    sprites = json.dumps(sprite_data())
    script = f"<script>window.NYANG_INLINE_SPRITES = {sprites};</script>\n<script type=\"module\">\n{bundle_js()}</script>"
    style = f"<style>\n{read('style.css')}</style>"
    if args.fragment:
        doc = f"{head.strip()}\n{style}\n{body.strip()}\n{script}\n"
    else:
        doc = (f'<!doctype html>\n<html lang="ko">\n<head>\n{head.strip()}\n{style}\n</head>\n'
               f'<body>\n{body.strip()}\n{script}\n</body>\n</html>\n')

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, 'w', encoding='utf-8') as f:
        f.write(doc)
    print(f'저장: {args.out} ({os.path.getsize(args.out) / 1024:.0f} KB)')


if __name__ == '__main__':
    main()
