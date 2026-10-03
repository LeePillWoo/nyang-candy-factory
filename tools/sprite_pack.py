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
"""
import argparse
import json
import os
import sys

from PIL import Image


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
    ap.add_argument('-o', '--out', required=True, help='출력 경로 접두사 (예: assets/sprites/cat)')
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
    args = ap.parse_args()

    img = Image.open(args.src).convert('RGBA')
    W, H = img.size

    # 알파 컷: 반투명 잡티(빨간 테두리 등)를 완전히 지운다
    r, g, b, a = img.split()
    a = a.point(lambda v: 0 if v < args.alpha_cut else v)
    img = Image.merge('RGBA', (r, g, b, a))
    mask = bytes(1 if v else 0 for v in a.tobytes())

    grid = detect(mask, W, H, args.min_gap, args.min_len)
    print(f'감지: {len(grid)}행')
    for i, frames in enumerate(grid):
        sizes = ' '.join(f'{x1 - x0}x{y1 - y0}' for x0, y0, x1, y1 in frames)
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
    cell_w = max(x1 - x0 for _, fr in used for x0, _, x1, _ in fr) + args.pad * 2
    cell_h = max(y1 - y0 for _, fr in used for _, y0, _, y1 in fr) + args.pad * 2
    cols = max(len(fr) for _, fr in used)

    # 배율은 프레임마다 적용해 셀 크기를 정수로 유지한다
    sc = args.scale
    resample = Image.LANCZOS if sc < 1 else Image.NEAREST
    cell_w, cell_h = round(cell_w * sc), round(cell_h * sc)
    pad = round(args.pad * sc)

    sheet = Image.new('RGBA', (cell_w * cols, cell_h * len(used)), (0, 0, 0, 0))
    meta_anims = {}
    for out_row, (name, frames) in enumerate(used):
        for i, (x0, y0, x1, y1) in enumerate(frames):
            crop = img.crop((x0, y0, x1, y1))
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
