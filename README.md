# 🍬 냥냥 수학 놀이터 (nyang-candy-factory)

초등학교 1학년 아이를 위한 사칙연산 웹게임 모음입니다. "공부"가 아니라 "게임"처럼 느껴지게 만드는 것이 목표예요.
첫 화면(`index.html`)에서 게임을 고릅니다.

- **🍬 냥냥 사탕 공장** (`candy.html`) — 동물 손님이 사탕을 주문하면 → 아이가 사탕을 봉지에 담고 → 정답을 고르면 → 고양이 직원 **냥이**가 봉지를 들고 배달합니다.
- **🐧 펭귄 남극탐험** (`penguin.html`) — 지평선을 향해 달리는 얼음길에서, 문제의 정답 숫자 깃발이 서 있는 길로 펭귄을 달리게 합니다. 아래 [펭귄 남극탐험](#-펭귄-남극탐험) 참고.

두 게임은 문제 생성(덧셈·뺄셈·곱셈·나눗셈·10 만들기, 난이도 4단계), 효과음, 코인, 화면 크기 맞춤을 함께 씁니다.

## 실행

빌드 도구가 필요 없습니다. 저장소 폴더에서:

```bash
python -m http.server 8000
```

브라우저에서 <http://localhost:8000> 을 엽니다. 같은 와이파이의 태블릿에서 `http://<내 PC IP>:8000` 으로 접속해도 됩니다.
(ES 모듈을 쓰기 때문에 `candy.html`·`penguin.html` 을 파일로 바로 열면 동작하지 않아요.)

### 파일 하나로 배포하기

```bash
python tools/build_single.py                 # → dist/candy.html   (JS·CSS·스프라이트 모두 포함)
python tools/build_single.py penguin.html    # → dist/penguin.html
```

만들어진 HTML 하나만 아무 정적 호스팅(GitHub Pages, Netlify 등)에 올리거나, 파일로 바로 열어도 동작합니다.

### GitHub Pages 배포 시 버전 올리기

GitHub Pages는 파일을 최대 10분 동안 캐시합니다. 바뀐 내용을 올릴 때는 `candy.html`·`penguin.html` 안의 `?v=9` 를 **모두** 다음 숫자(`?v=10`)로 바꿔 주세요. (CSS, 시작 스크립트, importmap 안의 모듈들. 새 모듈을 만들면 importmap 에도 추가)
그래야 폰에서 예전 파일과 새 파일이 섞이지 않고 한꺼번에 새로 받아집니다.

기기에서 화면이 잘리거나 너무 크게 보이면 주소 끝에 `?debug` 를 붙여 열어 보세요(예: `.../nyang-candy-factory/candy.html?debug`). 화면 왼쪽 아래에 브라우저가 알려 주는 화면 크기와 실제로 쓴 크기가 표시됩니다.

## 🍬 냥냥 사탕 공장

| 모드 | 그림으로 세기 | 아이가 하는 일 | 질문 |
|---|---|---|---|
| ➕ 덧셈 | 합 10 이하 | 사탕 기계를 탭 → 딸기·포도 봉지 칸을 채움 | 모두 몇 개? |
| ➖ 뺄셈 | 10 이하 | 봉지 속 사탕을 탭해서 손님에게 줌 | 남은 사탕은 몇 개? |
| ✖️ 곱셈 | 2~4개씩 2~4봉지 | 기계를 탭 → 봉지마다 누적 태그(2·4·6…), 마지막 봉지는 "?" | 모두 몇 개? |
| ➗ 나눗셈 | 2~3봉지 | 쟁반을 탭 → 봉지에 하나씩 번갈아 나눠 담음 | 한 봉지에 몇 개? |

| 🔟 10 만들기 | 1~9 | 10칸 봉지에 미리 든 사탕을 보고, 기계를 탭해 10칸을 꽉 채움 | 몇 개를 더 넣었을까? (`3 + ? = 10`) |

### 난이도

메뉴의 칸 모양 버튼(□•□, □□•□ …)으로 고릅니다. 10 만들기는 난이도와 상관없이 항상 같아요.

| 단계 | 덧셈·뺄셈·곱셈 | 나눗셈 | 푸는 방법 |
|---|---|---|---|
| 한 자리 | 위 표 그대로 | 위 표 그대로 | 그림으로 세기 / 숫자로 풀기 |
| 두 자리·한 자리 | 27 + 5, 43 − 8, 23 × 4 | 72 ÷ 4 | 숫자로 풀기 |
| 두 자리·두 자리 | 38 + 47, 72 − 35, 23 × 14 | 96 ÷ 32 | 숫자로 풀기 |
| 세 자리·세 자리 | 345 + 678, 702 − 358, 345 × 678 | 864 ÷ 432 | 숫자로 풀기 |

- **큰 수도 그림으로 (사탕 포장 놀이, `src/blocks.js`)** — 낱개 사탕 🍬 = 1, 사탕 막대 🍭 = 10, 사탕 상자 📦 = 100.
  - 덧셈: 보라 쟁반을 눌러 한 쟁반에 모으고, 낱개가 10개 넘으면 낱개를 눌러 막대로 **포장**(받아올림). 막대 10개도 상자로 포장.
  - 뺄셈: 손님에게 낱개 → 막대 → 상자 순서로 주고, 모자라면 윗자리 막대·상자를 눌러 **뜯기**(받아내림).
  - 곱셈(두 자리 × 한 자리): 사탕 기계를 눌러 봉지마다 같은 묶음 → 봉지를 눌러 한 쟁반에 모아 포장.
  - 나눗셈(두 자리 ÷ 한 자리): 막대부터 봉지에 하나씩 나누고, 모자라면 막대를 뜯어 낱개로 마저 나눔.
  - 지금 눌러야 할 칸이 노랗게 빛나고 👆 손가락이 가리켜요. 틀리면 상자 100·200, 막대 210·220, 낱개 221·222… 처럼 **뛰어 세기**로 같이 셉니다.
  - 그림으로 되는 범위: 덧셈·뺄셈은 모든 단계, 곱셈·나눗셈은 두 자리·한 자리까지. 나머지(곱셈 두 자리·두 자리 이상, 나눗셈 두 자리 ÷ 두 자리 이상)는 숫자로 풀어요.
- 숫자로 푸는 큰 수 문제에서 틀리면 **차근차근 풀이 보드**가 나와요. 덧셈·뺄셈은 세로셈(받아올림·받아내림 표시), 곱셈은 자리별로 나눠 곱하기(23×14 = 23×10 + 23×4), 나눗셈은 몇 번 들어가는지 덜어 내기로 보여 줍니다.
- 오답 보기는 받아올림을 잊은 답, 자리를 밀지 않은 곱처럼 자주 하는 실수로 만들어요.
- 단계가 오를 때마다 정답 코인이 1개씩 더 붙어요.

- **숫자로 풀기** 레벨은 식만 보여 주고(덧셈·뺄셈은 20까지, 곱셈·나눗셈은 5단까지), 틀리면 사탕 그림을 힌트로 펼쳐 줍니다.
- 정답은 **3지선다**(아이들이 자주 하는 실수를 오답 보기로 섞음). 타이핑은 없습니다.
- 틀려도 감점 없음: 고른 보기만 회색이 되고, 사탕 위에 숫자 배지(1, 2, 3…)가 하나씩 붙으며 같이 세어 준 뒤 다시 고릅니다.
- 1판 = 손님 5명(약 2~3분). 첫 시도 정답은 ⭐ + 코인 3개, 다시 해서 맞히면 코인 1개. 코인은 `localStorage` 에 저장됩니다.
- 효과음은 WebAudio로 합성하고, 주문·질문은 브라우저 음성(한국어 TTS)으로 읽어 줍니다. 🔊 버튼으로 끌 수 있어요.

## 🐧 펭귄 남극탐험

1983년 「남극탐험」처럼 펭귄이 지평선 쪽으로 달리는 원근 얼음길 게임에 수학을 넣었습니다.

- 메뉴에서 난이도(칸 모양 버튼)와 연산(+ − × ÷ 10 만들기)을 고르면 출발합니다.
- 문제가 뜨면 문제판에 보기 세 개가 **왼쪽 · 가운데 · 오른쪽 길 순서**로 나오고, 저 멀리 같은 숫자의 깃발 세 개가 다가옵니다. 정답 깃발이 있는 길로 가면 ⭐.
- 조작: ◀ ▶ 버튼(또는 화면 좌우로 밀기, 키보드 ← →)으로 길 바꾸기, **점프** 버튼(위로 밀기, 스페이스)으로 얼음 구멍 넘기. 🐟 물고기는 보너스.
- 틀리거나 구멍에 빠져도 벌은 없어요: 잠깐 미끄러지고 정답을 보여 준 뒤 계속 달립니다. 틀린 문제는 결과 화면의 **다시 보기**에 정답과 함께 나와요.
- 문제를 보고 깃발에 닿기까지 시간은 난이도별로 7·10·13·17초. 깃발 가까이에는 얼음 구멍이 생기지 않아 계산에 집중할 수 있어요.
- 5문제를 지나면 남극 기지에 도착(약 1~1.5분). 정답 하나에 코인 3개(+ 난이도 보너스), 물고기 2마리에 코인 1개.
- 주인공 펭귄은 스프라이트 시트(`assets/sprites/penguin.png`, 6×6)로 그립니다. 상황별 프레임은 `src/penguin/game.js` 의 `PENGUIN_FRAMES` 에 `[행, 칸]` 목록으로 적혀 있어요(달리기 뒷모습, 좌우 이동, 점프, 만세, 놀람, 구멍 빠짐). 시트를 못 불러오면 예전 코드 펭귄(`src/penguin/draw.js`)으로 그립니다.
- 얼음길·깃발·기지·물고기는 Canvas 코드로 그렸습니다(`src/penguin/draw.js`).

## 폴더 구조

```
index.html            첫 화면: 게임 고르기
candy.html            냥냥 사탕 공장 화면 뼈대 (HUD, 주문서, 답 버튼, 메뉴/결과 화면)
penguin.html          펭귄 남극탐험 화면 뼈대 (문제판, 조작 버튼, 메뉴/결과 화면)
style.css             두꺼운 외곽선의 스티커 느낌 UI (두 게임 공용)
penguin.css           펭귄 게임용 얼음 색·문제판·조작 버튼
src/
  sprites.js          SPRITES: 스프라이트 시트 메타 + 로더 + 프레임 그리기
  characters.js       CHARACTERS: 캐릭터 정의 (kind: 'sprite' | 'shape'), 손님 6종(호랑이·토끼·곰·시바·병아리·다람쥐 스프라이트)
  actor.js            Actor: moveTo(x)→Promise, hop(), carry(), say(), 공통 렌더 루프
  audio.js            WebAudio 효과음, 음성 안내
  problems.js         모드×레벨×난이도별 문제·보기 생성
  work.js             큰 수 오답 힌트용 풀이 단계(세로셈·자리별 곱셈·나눗셈)
  blocks.js           큰 수 그림 레벨: 낱개·막대·상자로 모으기·포장·뜯기·나누기
  viewport.js         보이는 화면 크기 재기 (삼성 인터넷 확대 대응, 두 게임 공용)
  game.js             사탕 공장: 게임 흐름(라운드/배달), 장면 그리기, 입력 처리
  penguin/draw.js     펭귄 게임 그리기 (하늘, 원근 얼음길, 펭귄, 구멍, 물고기, 깃발, 기지)
  penguin/game.js     펭귄 게임 흐름, 원근 투영, 입력 처리
assets/
  raw/cat_sheet.png   원본 고양이 시트 (6×6 칸, 흰 배경)
  raw/tiger_sheet.png 원본 호랑이 시트 (6×6 칸, 흰 배경)
  sprites/cat.png     sprite_pack.py 로 배경을 지우고 다시 포장한 시트 (+ cat.json 메타)
  raw/{rabbit,bear,shiba,chick,chipmunk,penguin}_sheet.png  새 동물 원본 시트
  sprites/tiger.png   〃 (+ tiger.json)
  sprites/{rabbit,bear,shiba,chick,chipmunk}.png  손님 시트 (walk / sit / fun 행)
  sprites/penguin.png 펭귄 남극탐험 주인공 시트 (row0~row5)
tools/
  sprite_pack.py      스프라이트 시트 자동 정리 도구
  build_single.py     게임 하나를 HTML 파일 하나로 묶기
```

### 구조 요약

- **SPRITES** — 시트 메타 `{ src, frameW, frameH, anims: { 이름: { row, frames, fps } } }`.
- **CHARACTERS** — `kind: 'sprite'` 는 SPRITES 시트를 쓰고, `anims[이름] = { anim, seq?, fps?, scale? }` 로 프레임 순서를 재정의할 수 있습니다. `kind: 'shape'` 는 `draw(ctx, pose)` 로 Canvas에 직접 그립니다.
- **Actor** — 두 종류 캐릭터를 같은 방식으로 다룹니다. 게임 로직은 `idle` / `walk`(있으면 `happy`, `sad`)만 호출하므로 캐릭터를 바꿔도 게임 코드는 그대로입니다. 없는 애니 이름은 `idle` 로 대체됩니다.
- 고양이 냥이 = 직원(스프라이트).
- 손님: 모두 스프라이트 동물. 호랑이 호돌이·토끼 토순이·곰돌이·시바·병아리 삐약이·다람쥐 다람이(`FEATURED_CUSTOMERS`) 중 5마리가 한 판에 한 번씩 무작위로 나옵니다. 코드로 그린 손님(`CUSTOMER_KEYS`)은 지금 비어 있지만 기능은 남아 있어 언제든 다시 넣을 수 있어요.

## 🐾 새 캐릭터 스프라이트로 교체하기

### 1. 원본 시트 준비

- 한 행 = 한 애니메이션, 프레임은 왼쪽→오른쪽.
- **투명 배경**이면 그대로, **흰 배경**이면 `--bg white` 를 붙이면 됩니다(가장자리에서 이어진 흰 배경과 옅은 그림자만 지우고, 캐릭터 안쪽의 흰 털은 남김).
- 칸이 **일정한 격자**(예: 6×6)면 `--grid 6x6` 을 붙이세요. 하트·물방울·느낌표 같은 효과가 캐릭터 옆에 떨어져 있어도 한 프레임으로 잘리고, 그림 위치를 그대로 유지해 움직일 때 흔들리지 않습니다. 이웃 칸 그림이 경계를 넘어 들어온 작은 조각은 자동으로 지웁니다.
- 격자가 아니고 프레임 크기나 간격이 들쭉날쭉해도 괜찮습니다. `--grid` 없이 쓰면 도구가 알아서 찾아 정렬합니다.
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

지금 고양이·호랑이는 이렇게 만들었습니다 (흰 배경 6×6 시트):

```bash
python tools/sprite_pack.py assets/raw/cat_sheet.png -o assets/sprites/cat --bg white --grid 6x6 \
    --anim walk=0 --anim groom=1 --anim happy=2 --anim surprise=3 --fps walk=10 --scale 0.85
python tools/sprite_pack.py assets/raw/tiger_sheet.png -o assets/sprites/tiger --bg white --grid 6x6 \
    --anim walk=0 --anim giggle=1 --anim happy=2 --fps walk=10 --scale 0.85
# 토끼·곰·시바·병아리·다람쥐 (0행 걷기, 1행 앉기, 2행 신남)
for n in rabbit bear shiba chick chipmunk; do
  python tools/sprite_pack.py assets/raw/${n}_sheet.png -o assets/sprites/$n --bg white --bg-tol 62 --grid 6x6 \
      --anim walk=0 --anim sit=1 --anim fun=2 --fps walk=10 --scale 0.95
done
# 펭귄 (행 이름 없이 row0~row5 로 전부)
python tools/sprite_pack.py assets/raw/penguin_sheet.png -o assets/sprites/penguin --bg white --bg-tol 62 --grid 6x6 --all --scale 0.95
```

그림을 바꾼 뒤에는 `src/sprites.js` 의 `SPRITE_VERSION` 을 1 올려 주세요(폰에 예전 그림이 캐시로 남지 않게).
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

손님으로 쓰려면 `src/characters.js` 에서:

- 스프라이트 동물은 `spriteCustomer(...)` 로 정의하고 `FEATURED_CUSTOMERS` 에 키를 추가 → 무작위로 골라 한 판(손님 5명)에 겹치지 않게 나옵니다. 5마리보다 적으면 남는 자리는 `CUSTOMER_KEYS` 손님이 채웁니다.
- 코드로 그린 동물은 `CUSTOMER_KEYS` 에 추가 → 무작위로 나옵니다.

손님 애니메이션 이름은 `idle`(앉아 있기), `walk`, `happy`(정답), `eat`(뺄셈에서 사탕 받아먹기)를 씁니다. 손님은 등장할 때 왼쪽을 보며 걸어 들어오고, `faces` 값에 따라 자동으로 좌우 반전됩니다. `scale` 은 다른 손님들(키 약 150~165px)과 비슷해지게 맞추세요(호랑이 1.08, 토끼 1.12, 곰·시바 1.25 …).

### 코드로 그린 캐릭터(shape)를 스프라이트로, 또는 그 반대로

`CHARACTERS` 항목의 `kind` 만 바꾸면 됩니다. 예를 들어 곰 손님을 스프라이트로 바꾸려면 `bear: { kind: 'sprite', sprite: 'bear', ... }` 로 교체하세요. shape 캐릭터는 `draw(ctx, pose)` 에서 `pose.anim`(`idle`/`walk`/`happy`/`eat`)과 `pose.t`(초)를 받아 (0,0)=발 아래 중앙 기준으로 그리면 됩니다.

## 만들 때 지킨 원칙

- 탭 위주, 타이핑 없음, 큰 버튼(터치 우선), 1판 2~3분
- 실패해도 벌 없음 — 오답은 "같이 세어 볼까?" 힌트로 이어짐
- 글을 잘 못 읽어도 되도록 손가락 👆 안내와 음성 안내
- 화면 방향에 따라 무대를 자동으로 바꿈: 가로(태블릿·PC·가로 폰)는 1280×800 한 줄 무대, 세로(폰·세로 태블릿)는 폭 720의 3단 무대(손님 / 카운터 / 공장 바닥). 게임 도중 화면을 돌려도 진행 상태가 유지되고, 노치·홈 바 영역은 피해서 배치
