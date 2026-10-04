#!/usr/bin/env python3
"""sprite_pack.py — 손그림/AI 생성 스프라이트 시트를 게임용 균일 그리드로 다시 포장한다.

원본 시트는 프레임 크기·간격이 제각각인 경우가 많다. 이 도구는
  1) 알파 채널을 가로로 투영해 '행(row)' 띠를 찾고
  2) 각 행 안에서 세로로 투영해 '프레임' 덩어리를 찾은 뒤
  3) 모든 프레임을 같은 크기의 셀에 '하단 중앙' 정렬로 다시 배치한다.
결과물: <out>.png (균일 셀 시트) + <out>.json (frameW/frameH/anims 메타)

사용 예:
  python tools/sprite_pack.py assets/raw/cat_sheet.png -o assets/sprites/cat \
      --anim walk=0 --anim idle=3 --fps walk=12 --scale 0.75

옵션 요약:
  --anim name=ROW         이름 붙일 애니메이션 (ROW는 감지된 행 번호, 0부터)
  --fps name=N            애니메이션별 fps (기본 --default-fps)
  --scale S               출력 배율 (픽셀아트는 nearest 리샘플)
  --alpha-cut A           알파 A 미만 픽셀은 완전 투명 처리 (가장자리 잡티 제거)
  --all                   --anim을 안 줘도 모든 행을 row0..rowN 으로 내보냄
  --pad P                 셀 안쪽 여백(px)
  --bg white              흰 배경 시트: 가장자리에서 이어진 흰 배경(+옅은 그림자)을 지워 투명하게
  --grid 6x6              칸이 일정한 시트: 자동 감지 대신 균일하게 자르고, 그림 위치를 그대로 유지
                          (하트·물방울 같은 효과가 옆에 붙어 있어도 프레임이 흔들리지 않음)
  --baseline              (--grid 와 함께) 줄마다 발끝을 맞춘다. 아래 줄로 갈수록 그림이 칸 안에서 떠 있는 시트용
  --quantize              256색 팔레트 PNG 로 줄인다 (눈으로는 거의 같고 파일은 약 1/3).
                          `pip install imagequant` 가 있으면 그걸 쓰고, 없으면 Pillow 기본 방식.
  --shrink                이미 포장된 시트를 그 자리에서 256색으로만 줄인다 (칸 · json 은 그대로)
                          예: python tools/sprite_pack.py assets/sprites/cat.png --shrink

흰 배경 + 6x6 칸 시트 예:
  python tools/sprite_pack.py assets/raw/cat2_sheet.png -o assets/sprites/cat --bg white --grid 6x6 \
      --anim walk=0 --anim groom=1 --anim happy=2 --scale 0.62
"""
import argparse
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFilter


def runs(profile, min_gap, min_len):
    """1차원 프로파일에서 0이 아닌 구간들을 찾는다. min_gap 미만의 빈틈은 이어 붙인다."""
    segs = []
    start = None
    gap = 0
    for i, v in enumerate(profile):
        if v > 0:
            if start is None:
                start = i
            gap = 0
            end = i + 1
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                segs.append((start, end))
                start = None
    if start is not None:
        segs.append((start, end))
    return [s for s in segs if s[1] - s[0] >= min_len]


def detect(alpha, width, height, min_gap, min_len):
    """alpha: 0/1 마스크(bytes, row-major). 반환: [[(x0,y0,x1,y1), ...], ...] 행별 프레임 bbox."""
    row_prof = [sum(alpha[y * width:(y + 1) * width]) for y in range(height)]
    rows = runs(row_prof, min_gap, min_len)
    result = []
    for (y0, y1) in rows:
        col_prof = [0] * width
        for y in range(y0, y1):
            line = alpha[y * width:(y + 1) * width]
            for x in range(width):
                if line[x]:
                    col_prof[x] += 1
        frames = []
        for (x0, x1) in runs(col_prof, min_gap, min_len):
            # 프레임별로 세로 범위를 다시 좁힌다 (발끝 정렬용)
            fy0, fy1 = y1, y0
            for y in range(y0, y1):
                if any(alpha[y * width + x0:y * width + x1]):
                    fy0 = min(fy0, y)
                    fy1 = max(fy1, y + 1)
            frames.append((x0, fy0, x1, fy1))
        result.append(frames)
    return result


def remove_white_bg(img, tol):
    """가장자리에서 이어진 흰(밝은) 배경과 옅은 그림자를 투명하게.
    외곽선의 작은 틈으로 배경이 얼굴 속까지 새지 않도록, 어두운 선을 2px 두껍게 만든 밝기 지도에서 채운다."""
    rgb = img.convert('RGB')
    lum = rgb.convert('L')
    thick = lum.filter(ImageFilter.MinFilter(5))       # 어두운 외곽선을 두껍게 → 틈 메우기
    w, h = rgb.size
    marker = 0
    work = thick.point(lambda v: max(1, v))            # 0 은 표시용으로 비워 둔다
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if work.getpixel(seed) != marker:
            ImageDraw.floodfill(work, seed, marker, thresh=tol)
    bgmask = work.point(lambda v: 255 if v == marker else 0)
    # 배경과 맞닿은 3px 안쪽의 밝은 테두리(흰 스티커 테두리·번짐)는 밝기만큼 투명하게
    ring = bgmask.filter(ImageFilter.MaxFilter(7))
    alpha = []
    for bgv, rv, lv in zip(bgmask.tobytes(), ring.tobytes(), lum.tobytes()):
        if bgv:
            alpha.append(0)
        elif rv and lv > 200:
            alpha.append(max(0, min(255, (255 - lv) * 5)))
        else:
            alpha.append(255)
    a = Image.new('L', rgb.size)
    a.putdata(alpha)
    out = rgb.convert('RGBA')
    out.putalpha(a)
    return out


def drop_edge_bits(img, box, keep_ratio=0.03, sliver=14):
    """칸 경계에 걸쳐 들어온 이웃 칸 그림 조각을 지운다.
    칸 테두리에 닿은 덩어리 중 (칸 안 그림의 keep_ratio 보다 작거나) 테두리 쪽으로 얇은(sliver px 이하) 조각만 투명하게.
    예: 위 칸 캐릭터의 발밑 윤곽선이 아래 칸 꼭대기에 '︶' 모양으로 걸쳐 들어온 것."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    a = img.getchannel('A').crop(box)
    px = a.load()
    seen = bytearray(w * h)
    total = sum(1 for v in a.tobytes() if v > 40)
    if not total:
        return
    for sy in range(h):
        for sx in range(w):
            if seen[sy * w + sx] or px[sx, sy] <= 40:
                continue
            stack, comp = [(sx, sy)], []
            seen[sy * w + sx] = 1
            while stack:
                x, y = stack.pop()
                comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny] > 40:
                        seen[ny * w + nx] = 1
                        stack.append((nx, ny))
            xs = [x for x, _ in comp]
            ys = [y for _, y in comp]
            bx0, bx1, by0, by1 = min(xs), max(xs), min(ys), max(ys)
            top_bottom = by0 == 0 or by1 == h - 1
            left_right = bx0 == 0 or bx1 == w - 1
            if not (top_bottom or left_right):
                continue
            thin = (top_bottom and by1 - by0 < sliver) or (left_right and bx1 - bx0 < sliver)
            if thin or len(comp) < total * keep_ratio:
                for x, y in comp:
                    img.putpixel((x0 + x, y0 + y), (0, 0, 0, 0))


def grid_frames(img, cols, rows, use_rows=None, baseline=False):
    """균일한 칸으로 자른 프레임 그림들 [[Image | None]]. 내용 bbox 의 합집합(같은 창)으로 잘라 그림 위치를 유지한다.
    칸마다 자기 칸 픽셀만 쓴다(이웃 칸 조각이 섞이지 않게).
    baseline=True: 줄마다 발끝(내용 아래쪽의 가운데값)을 맞춘다. AI 가 만든 격자는 아래 줄로 갈수록
                   캐릭터가 칸 안에서 위로 떠 있는 경우가 많아, 그대로 쓰면 그 줄 동작에서 붕 떠 보인다."""
    W, H = img.size
    cw, ch = W / cols, H / rows
    cells = []
    for r in range(rows):
        row = []
        for c in range(cols):
            cell = img.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
            row.append((cell, cell.getchannel('A').getbbox()))
        cells.append(row)
    used_rows = [r for r in range(rows) if (use_rows is None or r in use_rows) and any(bb for _, bb in cells[r])]
    shift = {r: 0 for r in range(rows)}
    if baseline:
        base = {r: sorted(bb[3] for _, bb in cells[r] if bb)[sum(1 for _, bb in cells[r] if bb) // 2] for r in used_rows}
        lowest = max(base.values())
        shift.update({r: lowest - b for r, b in base.items()})
    boxes = [(bb[0], bb[1] + shift[r], bb[2], bb[3] + shift[r]) for r in used_rows for _, bb in cells[r] if bb]
    ux0 = min(b[0] for b in boxes); uy0 = min(b[1] for b in boxes)
    ux1 = max(b[2] for b in boxes); uy1 = max(b[3] for b in boxes)
    grid = []
    for r in range(rows):
        row = []
        for cell, bb in cells[r]:
            if not bb:
                row.append(None)      # 빈 칸
                continue
            f = Image.new('RGBA', (ux1 - ux0, uy1 - uy0), (0, 0, 0, 0))
            f.paste(cell, (-ux0, shift[r] - uy0))
            row.append(f)
        grid.append(row)
    return grid


def quantize(img):
    """RGBA → 256색(알파 포함) 팔레트. 폰에서 받는 용량을 크게 줄인다."""
    try:
        import imagequant
        return imagequant.quantize_pil_image(img, dithering_level=1.0, max_colors=256, min_quality=0, max_quality=100)
    except ImportError:
        print('  (imagequant 가 없어 Pillow 기본 방식으로 줄입니다. 더 깔끔하게: pip install imagequant)')
        return img.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)


def parse_kv(items, cast, what):
    out = {}
    for it in items or []:
        if '=' not in it:
            sys.exit(f'{what} 형식은 name=value 입니다: {it!r}')
        k, v = it.split('=', 1)
        out[k.strip()] = cast(v)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src', help='원본 스프라이트 시트 PNG (투명 배경)')
    ap.add_argument('-o', '--out', help='출력 경로 접두사 (예: assets/sprites/cat)')
    ap.add_argument('--anim', action='append', help='name=ROW')
    ap.add_argument('--fps', action='append', help='name=FPS')
    ap.add_argument('--default-fps', type=float, default=8)
    ap.add_argument('--scale', type=float, default=1.0)
    ap.add_argument('--alpha-cut', type=int, default=32)
    ap.add_argument('--min-gap', type=int, default=6, help='이보다 좁은 빈틈은 같은 덩어리로 봄')
    ap.add_argument('--min-len', type=int, default=12, help='이보다 작은 덩어리는 잡티로 무시')
    ap.add_argument('--pad', type=int, default=2)
    ap.add_argument('--all', action='store_true', help='모든 행을 rowN 이름으로 내보냄')
    ap.add_argument('--dry-run', action='store_true', help='감지 결과만 출력')
    ap.add_argument('--bg', choices=['none', 'white'], default='none', help='white: 흰 배경을 지움')
    ap.add_argument('--bg-tol', type=int, default=42, help='흰 배경으로 볼 밝기 차이 (그림자까지 지우려면 크게)')
    ap.add_argument('--grid', help='COLSxROWS: 균일한 칸으로 자르기 (예: 6x6)')
    ap.add_argument('--quantize', action='store_true', help='256색 팔레트 PNG 로 저장 (용량 약 1/3)')
    ap.add_argument('--baseline', action='store_true', help='--grid 와 함께: 줄마다 발끝을 맞춤 (아래 줄이 떠 보이는 시트)')
    ap.add_argument('--shrink', action='store_true', help='이미 포장된 시트(src)를 256색으로 줄여 그 자리에 덮어쓰기만 한다')
    args = ap.parse_args()

    if args.shrink:
        before = os.path.getsize(args.src)
        quantize(Image.open(args.src).convert('RGBA')).save(args.src, optimize=True)
        print(f'줄임: {args.src} {before // 1024}KB → {os.path.getsize(args.src) // 1024}KB')
        return
    if not args.out:
        ap.error('-o/--out 이 필요합니다')

    img = Image.open(args.src).convert('RGBA')
    W, H = img.size
    if args.bg == 'white':
        img = remove_white_bg(img, args.bg_tol)

    # 알파 컷: 반투명 잡티(빨간 테두리 등)를 완전히 지운다
    r, g, b, a = img.split()
    a = a.point(lambda v: 0 if v < args.alpha_cut else v)
    img = Image.merge('RGBA', (r, g, b, a))
    mask = bytes(1 if v else 0 for v in a.tobytes())

    if args.grid:
        gc, gr = (int(v) for v in args.grid.lower().split('x'))
        for ri in range(gr):
            for ci in range(gc):
                drop_edge_bits(img, (round(ci * W / gc), round(ri * H / gr), round((ci + 1) * W / gc), round((ri + 1) * H / gr)))
        # 쓰는 행만 기준으로 칸 크기를 잡아 여백(특히 발밑)을 줄인다. 빈 칸(그림 없는 칸)은 프레임에서 뺀다
        use_rows = set(parse_kv(args.anim, int, '--anim').values()) or None
        grid = [[f for f in row if f is not None] for row in grid_frames(img, gc, gr, use_rows, args.baseline)]
    else:
        grid = [[img.crop(b) for b in row] for row in detect(mask, W, H, args.min_gap, args.min_len)]
    print(f'감지: {len(grid)}행')
    for i, frames in enumerate(grid):
        sizes = ' '.join(f'{f.width}x{f.height}' for f in frames)
        print(f'  row{i}: {len(frames)}프레임  [{sizes}]')
    if args.dry_run:
        return

    anim_rows = parse_kv(args.anim, int, '--anim')
    fps = parse_kv(args.fps, float, '--fps')
    if not anim_rows:
        if not args.all:
            sys.exit('--anim name=ROW 를 하나 이상 주거나 --all 을 쓰세요.')
        anim_rows = {f'row{i}': i for i in range(len(grid))}
    for name, row in anim_rows.items():
        if not 0 <= row < len(grid):
            sys.exit(f'{name}: row {row} 없음 (0..{len(grid) - 1})')

    used = [(name, grid[row]) for name, row in anim_rows.items()]
    cell_w = max(f.width for _, fr in used for f in fr) + args.pad * 2
    cell_h = max(f.height for _, fr in used for f in fr) + args.pad * 2
    cols = max(len(fr) for _, fr in used)

    # 배율은 프레임마다 적용해 셀 크기를 정수로 유지한다
    sc = args.scale
    resample = Image.LANCZOS if sc < 1 else Image.NEAREST
    cell_w, cell_h = round(cell_w * sc), round(cell_h * sc)
    pad = round(args.pad * sc)

    sheet = Image.new('RGBA', (cell_w * cols, cell_h * len(used)), (0, 0, 0, 0))
    meta_anims = {}
    for out_row, (name, frames) in enumerate(used):
        for i, crop in enumerate(frames):
            if sc != 1.0:
                crop = crop.resize((max(1, round(crop.width * sc)), max(1, round(crop.height * sc))), resample)
            # 하단 중앙 정렬: 발이 셀 바닥(pad 위)에 닿도록
            dx = i * cell_w + (cell_w - crop.width) // 2
            dy = out_row * cell_h + cell_h - pad - crop.height
            sheet.paste(crop, (dx, dy))
        meta_anims[name] = {
            'row': out_row,
            'frames': len(frames),
            'fps': fps.get(name, args.default_fps),
        }

    os.makedirs(os.path.dirname(args.out) or '.', exist_ok=True)
    png_path = args.out + '.png'
    if args.quantize:
        sheet = quantize(sheet)
    sheet.save(png_path, optimize=True)
    meta = {
        'src': os.path.basename(png_path),
        'frameW': cell_w,
        'frameH': cell_h,
        'anims': meta_anims,
    }
    with open(args.out + '.json', 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print(f'저장: {png_path} ({sheet.width}x{sheet.height}), {args.out}.json  셀 {cell_w:g}x{cell_h:g}')


if __name__ == '__main__':
    main()
