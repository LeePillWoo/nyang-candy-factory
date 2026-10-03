# 🍬 냥냥 사탕 공장 (nyang-candy-factory)

초등학교 1학년 아이를 위한 사칙연산 웹게임입니다. "공부"가 아니라 "게임"처럼 느껴지게 만드는 것이 목표예요.

동물 손님이 사탕을 주문하면 → 아이가 사탕을 봉지에 담고 → 마지막에 정답을 고르면 → 고양이 직원 **냥이**가 봉지를 들고 배달합니다.

## 실행

빌드 도구가 필요 없습니다. 저장소 폴더에서:

```bash
python -m http.server 8000
```

브라우저에서 <http://localhost:8000> 을 엽니다. 같은 와이파이의 태블릿에서 `http://<내 PC IP>:8000` 으로 접속해도 됩니다.
(ES 모듈을 쓰기 때문에 `index.html` 을 파일로 바로 열면 동작하지 않아요.)

### 파일 하나로 배포하기

```bash
python tools/build_single.py        # → dist/nyang-candy-factory.html (JS·CSS·스프라이트 모두 포함)
```

만들어진 HTML 하나만 아무 정적 호스팅(GitHub Pages, Netlify 등)에 올리거나, 파일로 바로 열어도 동작합니다.

## 게임 방법

| 모드 | 그림으로 세기 | 아이가 하는 일 | 질문 |
|---|---|---|---|
| ➕ 덧셈 | 합 10 이하 | 사탕 기계를 탭 → 딸기·포도 봉지 칸을 채움 | 모두 몇 개? |
| ➖ 뺄셈 | 10 이하 | 봉지 속 사탕을 탭해서 손님에게 줌 | 남은 사탕은 몇 개? |
| ✖️ 곱셈 | 2~4개씩 2~4봉지 | 기계를 탭 → 봉지마다 누적 태그(2·4·6…), 마지막 봉지는 "?" | 모두 몇 개? |
| ➗ 나눗셈 | 2~3봉지 | 쟁반을 탭 → 봉지에 하나씩 번갈아 나눠 담음 | 한 봉지에 몇 개? |

- **숫자로 풀기** 레벨은 식만 보여 주고(덧셈·뺄셈은 20까지, 곱셈·나눗셈은 5단까지), 틀리면 사탕 그림을 힌트로 펼쳐 줍니다.
- 정답은 **3지선다**(아이들이 자주 하는 실수를 오답 보기로 섞음). 타이핑은 없습니다.
- 틀려도 감점 없음: 고른 보기만 회색이 되고, 사탕 위에 숫자 배지(1, 2, 3…)가 하나씩 붙으며 같이 세어 준 뒤 다시 고릅니다.
- 1판 = 손님 5명(약 2~3분). 첫 시도 정답은 ⭐ + 코인 3개, 다시 해서 맞히면 코인 1개. 코인은 `localStorage` 에 저장됩니다.
- 효과음은 WebAudio로 합성하고, 주문·질문은 브라우저 음성(한국어 TTS)으로 읽어 줍니다. 🔊 버튼으로 끌 수 있어요.

## 폴더 구조

```
index.html            화면 뼈대 (HUD, 주문서, 답 버튼, 메뉴/결과 화면)
style.css             두꺼운 외곽선의 스티커 느낌 UI
src/
  sprites.js          SPRITES: 스프라이트 시트 메타 + 로더 + 프레임 그리기
  characters.js       CHARACTERS: 캐릭터 정의 (kind: 'sprite' | 'shape'), 손님 6종 코드 드로잉
  actor.js            Actor: moveTo(x)→Promise, hop(), carry(), say(), 공통 렌더 루프
  audio.js            WebAudio 효과음, 음성 안내
  problems.js         모드×레벨별 문제·보기 생성
  game.js             게임 흐름(라운드/배달), 장면 그리기, 입력 처리
assets/
  raw/cat_sheet.png   원본 고양이 시트 (8×8, 투명 배경)
  sprites/cat.png     sprite_pack.py 로 다시 포장한 균일 그리드 시트
  sprites/cat.json    그 메타데이터
tools/
  sprite_pack.py      스프라이트 시트 자동 정리 도구
```

### 구조 요약

- **SPRITES** — 시트 메타 `{ src, frameW, frameH, anims: { 이름: { row, frames, fps } } }`.
- **CHARACTERS** — `kind: 'sprite'` 는 SPRITES 시트를 쓰고, `anims[이름] = { anim, seq?, fps?, scale? }` 로 프레임 순서를 재정의할 수 있습니다. `kind: 'shape'` 는 `draw(ctx, pose)` 로 Canvas에 직접 그립니다.
- **Actor** — 두 종류 캐릭터를 같은 방식으로 다룹니다. 게임 로직은 `idle` / `walk`(있으면 `happy`, `sad`)만 호출하므로 캐릭터를 바꿔도 게임 코드는 그대로입니다. 없는 애니 이름은 `idle` 로 대체됩니다.
- 고양이 냥이 = 직원(실제 스프라이트), 손님 6종(곰·토끼·돼지·여우·강아지·판다) = 코드 드로잉.

## 🐾 새 캐릭터 스프라이트로 교체하기

### 1. 원본 시트 준비

- **투명 배경 PNG**, 한 행 = 한 애니메이션, 프레임은 왼쪽→오른쪽.
- 프레임 크기나 간격이 들쭉날쭉해도 괜찮습니다. 도구가 알아서 찾아 정렬합니다.
- 캐릭터가 **오른쪽을 보는** 그림이면 가장 편합니다(왼쪽이면 2단계의 `faces` 를 `'left'` 로).
- `assets/raw/` 에 넣습니다. 예: `assets/raw/dog_sheet.png`

### 2. 행/프레임 감지 확인

```bash
pip install pillow
python tools/sprite_pack.py assets/raw/dog_sheet.png -o assets/sprites/dog --dry-run
```

```
감지: 8행
  row0: 8프레임  [136x104 125x113 ...]
  row1: 8프레임  ...
```

행 수/프레임 수가 그림과 다르면 옵션을 조절합니다.

| 옵션 | 설명 | 기본값 |
|---|---|---|
| `--alpha-cut A` | 알파가 A 미만인 픽셀은 지움 (가장자리 잡티·색 번짐 제거) | 32 |
| `--min-gap N` | N px보다 좁은 빈틈은 같은 덩어리로 봄 (프레임이 쪼개지면 ↑) | 6 |
| `--min-len N` | N px보다 작은 덩어리는 잡티로 무시 | 12 |
| `--pad N` | 셀 안쪽 여백 | 2 |

### 3. 패킹

필요한 행에 이름을 붙여 내보냅니다. 게임에는 최소한 **`idle` 과 `walk`** 가 필요합니다.

```bash
python tools/sprite_pack.py assets/raw/dog_sheet.png -o assets/sprites/dog \
    --anim walk=0 --anim idle=3 --anim face=6 \
    --fps walk=12 --fps idle=4 --scale 0.75
```

- 알파 투영으로 행 띠 → 행마다 프레임을 찾고,
- 모든 프레임을 같은 크기 셀에 **하단 중앙 정렬**(발끝이 셀 바닥에 닿게)로 다시 배치하므로 걷는 동안 캐릭터가 떨리지 않습니다.
- 결과: `assets/sprites/dog.png` + `assets/sprites/dog.json`
- 행 이름을 정하기 전에 전체를 보고 싶으면 `--all` (row0, row1… 이름으로 내보냄).

### 4. SPRITES 에 등록 (`src/sprites.js`)

`dog.json` 내용을 그대로 붙여 넣습니다.

```js
export const SPRITES = {
  cat: { ... },
  dog: {
    src: 'dog.png',
    frameW: 116,
    frameH: 102,
    anims: {
      walk: { row: 0, frames: 8, fps: 12 },
      idle: { row: 1, frames: 8, fps: 4 },
      face: { row: 2, frames: 8, fps: 8 },
    },
  },
};
```

### 5. CHARACTERS 에 등록 (`src/characters.js`)

```js
dogStaff: {
  name: '멍이',
  kind: 'sprite',
  sprite: 'dog',      // SPRITES 키
  scale: 1.45,        // 화면 배율 (냥이는 약 130px 높이)
  faces: 'right',     // 원본 그림이 보는 방향
  height: 130,        // 말풍선·들고 있는 봉지 위치용
  anims: {
    idle:  { anim: 'idle', seq: [0, 0, 1, 2, 1, 0, 6] }, // 프레임 순서 재정의
    walk:  { anim: 'walk' },
    happy: { anim: 'face', seq: [1, 2, 1], fps: 5, scale: 1.3 }, // 이 애니만 크기 보정
  },
},
```

- `seq` 로 같은 행의 프레임을 원하는 순서·반복으로 재생할 수 있습니다(눈 깜빡임을 가끔만 넣는 등).
- `scale` 은 그 애니메이션에만 곱해지는 보정값입니다. 행마다 그림 크기가 다를 때 씁니다.

### 6. 게임에서 사용

직원을 바꾸려면 `src/game.js` 에서:

```js
this.cat = new Actor('dogStaff', CAT_HOME, FLOOR, { facing: 'right', speed: 300 });
```

손님으로 쓰려면 `CUSTOMER_KEYS` 배열에 키를 추가하면 됩니다. 손님은 등장할 때 왼쪽을 보며 걸어 들어오고, `faces` 값에 따라 자동으로 좌우 반전됩니다.

### 코드로 그린 캐릭터(shape)를 스프라이트로, 또는 그 반대로

`CHARACTERS` 항목의 `kind` 만 바꾸면 됩니다. 예를 들어 곰 손님을 스프라이트로 바꾸려면 `bear: { kind: 'sprite', sprite: 'bear', ... }` 로 교체하세요. shape 캐릭터는 `draw(ctx, pose)` 에서 `pose.anim`(`idle`/`walk`/`happy`/`eat`)과 `pose.t`(초)를 받아 (0,0)=발 아래 중앙 기준으로 그리면 됩니다.

## 만들 때 지킨 원칙

- 탭 위주, 타이핑 없음, 큰 버튼(터치 우선), 1판 2~3분
- 실패해도 벌 없음 — 오답은 "같이 세어 볼까?" 힌트로 이어짐
- 글을 잘 못 읽어도 되도록 손가락 👆 안내와 음성 안내
- 1280×800 논리 화면을 기기 크기에 맞춰 확대/축소 (태블릿 가로 모드 권장)
