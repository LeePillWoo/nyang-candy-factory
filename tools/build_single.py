#!/usr/bin/env python3
"""build_single.py — 게임 하나를 HTML 파일 하나로 묶는다 (정적 호스팅/Artifact 배포용).

  python tools/build_single.py                      # candy.html   → dist/candy.html
  python tools/build_single.py penguin.html         # penguin.html → dist/penguin.html
  python tools/build_single.py candy.html --fragment -o out.html   # <html>/<head>/<body> 없이

- 페이지의 <script type="module" src=...> 에서 시작해 import 를 따라가며 모듈을 모으고,
  각 모듈을 함수로 감싸 이름 충돌 없이 한 <script> 에 넣는다 (의존하는 모듈이 먼저).
- 로컬 CSS(<link rel="stylesheet" href="*.css">)는 인라인, 스프라이트를 쓰면 PNG 를 data URI 로 넣는다.
"""
import argparse
import base64
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

IMPORT_RE = re.compile(r"^import\s+(\{[^}]*\}|\*\s+as\s+\w+)\s+from\s+'(\.{1,2}/[^']+\.js)';\s*$", re.M)
EXPORT_RE = re.compile(r"^export\s+(?:const|let|function|class)\s+(\w+)", re.M)


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def mod_id(path):
    rel = os.path.relpath(path, ROOT)
    return '__mod_' + re.sub(r'\W', '_', rel[:-3])


def collect(entry):
    """entry 부터 import 를 따라가며 [의존 모듈 …, entry] 순서의 경로 목록."""
    order, seen = [], set()

    def visit(path, stack):
        if path in seen:
            return
        if path in stack:
            raise SystemExit(f'순환 import: {path}')
        src = read(path)
        for _, spec in IMPORT_RE.findall(src):
            visit(os.path.normpath(os.path.join(os.path.dirname(path), spec)), stack | {path})
        seen.add(path)
        order.append(path)

    visit(entry, set())
    return order


def bundle_js(entry):
    parts = []
    for path in collect(entry):
        src = read(path)
        exports = EXPORT_RE.findall(src)

        def repl(m, base=os.path.dirname(path)):
            target = mod_id(os.path.normpath(os.path.join(base, m.group(2))))
            what = m.group(1)
            if what.startswith('*'):
                return f"const {what.split()[-1]} = {target};"
            return f"const {what} = {target};"

        src = IMPORT_RE.sub(repl, src)
        src = re.sub(r"^export\s+", "", src, flags=re.M)
        if re.search(r"^\s*(import|export)\b", src, re.M):
            raise SystemExit(f'{os.path.relpath(path, ROOT)}: 처리하지 못한 import/export 가 있습니다')
        name = os.path.relpath(path, ROOT)
        parts.append(f"// ── {name} ──\nconst {mod_id(path)} = (() => {{\n{src}\nreturn {{ {', '.join(exports)} }};\n}})();\n")
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
    ap.add_argument('page', nargs='?', default='candy.html', help='게임 페이지 (candy.html, penguin.html)')
    ap.add_argument('-o', '--out', help='출력 경로 (기본 dist/<페이지 이름>.html)')
    ap.add_argument('--fragment', action='store_true', help='문서 뼈대 태그 없이 출력')
    args = ap.parse_args()

    page = os.path.join(ROOT, args.page)
    out = args.out or os.path.join(ROOT, 'dist', os.path.basename(args.page))
    html = read(page)
    head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
    body = re.search(r'<body[^>]*>(.*?)</body>', html, re.S).group(1)
    body_attr = re.search(r'<body([^>]*)>', html).group(1)

    entry = re.search(r'<script type="module" src="([^"?]+)[^"]*"></script>', body).group(1)
    js = bundle_js(os.path.join(ROOT, entry))

    css = []
    for href in re.findall(r'<link rel="stylesheet" href="([^"?:]+\.css)[^"]*">', head):
        css.append(read(os.path.join(ROOT, href)))
    head = re.sub(r'\s*<link rel="stylesheet" href="[^":]+\.css[^"]*">', '', head)
    body = re.sub(r'\s*<!--[^>]*-->\s*<script type="importmap">.*?</script>', '', body, flags=re.S)
    body = re.sub(r'\s*<script type="module" src="[^"]*"></script>', '', body)
    if args.fragment:  # 게시 쪽 뼈대가 charset/viewport 를 넣어 준다
        head = re.sub(r'\s*<meta (charset|name="viewport")[^>]*>', '', head)
        # body 의 class 는 감싸는 div 로 대신 (CSS 는 body.xxx 선택자를 쓰므로 스크립트로 옮김)
        cls = re.search(r'class="([^"]*)"', body_attr)
        if cls:
            body = f'<script>document.body.classList.add({json.dumps(cls.group(1))});</script>\n' + body

    sprites = f"<script>window.NYANG_INLINE_SPRITES = {json.dumps(sprite_data())};</script>\n" if 'NYANG_INLINE_SPRITES' in js else ''
    script = f"{sprites}<script type=\"module\">\n{js}</script>"
    style = f"<style>\n{''.join(css)}</style>"
    if args.fragment:
        doc = f"{head.strip()}\n{style}\n{body.strip()}\n{script}\n"
    else:
        doc = (f'<!doctype html>\n<html lang="ko">\n<head>\n{head.strip()}\n{style}\n</head>\n'
               f'<body{body_attr}>\n{body.strip()}\n{script}\n</body>\n</html>\n')

    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        f.write(doc)
    print(f'저장: {out} ({os.path.getsize(out) / 1024:.0f} KB)')


if __name__ == '__main__':
    main()
