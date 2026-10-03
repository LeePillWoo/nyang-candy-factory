// 큰 수(난이도 2~4) 오답 힌트: 차근차근 풀이 단계를 만든다.
//   덧셈·뺄셈 → 세로셈(column): 일의 자리부터 받아올림/받아내림
//   곱셈      → 자리값으로 나눠 곱하기(lines): 23×14 = 23×10 + 23×4
//   나눗셈    → 몇 번 들어가는지 나눠 빼기(lines)

const PLACE = ['일의 자리', '십의 자리', '백의 자리', '천의 자리', '만의 자리'];
const digits = (n) => String(n).split('').reverse().map(Number);

export function solutionSteps(p) {
  switch (p.mode) {
    case 'add': return columnAdd(p.a, p.b);
    case 'sub': return columnSub(p.a, p.b);
    case 'mul': return mulLines(p.a, p.b);
    case 'div': return divLines(p.a, p.b);
  }
  return null;
}

// steps[i] = { place, digit, note, marks: [{ place, value }], strike: [place] }
function columnAdd(a, b) {
  const da = digits(a), db = digits(b);
  const n = Math.max(da.length, db.length);
  const steps = [];
  let carry = 0;
  for (let i = 0; i < n; i++) {
    const x = da[i] || 0, y = db[i] || 0;
    const s = x + y + carry;
    const sum = carry ? `${x} + ${y} + 1` : `${x} + ${y}`;
    steps.push({
      place: i,
      digit: s % 10,
      marks: s >= 10 ? [{ place: i + 1, value: 1 }] : [],
      note: `${PLACE[i]}: ${sum} = ${s}${s >= 10 ? ` → ${s % 10} 쓰고 1 올려요` : ''}`,
    });
    carry = s >= 10 ? 1 : 0;
  }
  if (carry) steps.push({ place: n, digit: 1, marks: [], note: '올린 1을 맨 앞에 내려 써요' });
  return { kind: 'column', op: '+', a, b, width: n + carry, steps, answer: a + b };
}

function columnSub(a, b) {
  const da = digits(a), db = digits(b);
  const answer = a - b;
  const len = String(answer).length;
  const steps = [];
  let borrowIn = 0;
  for (let i = 0; i < da.length; i++) {
    const y = db[i] || 0;
    let top = da[i] - borrowIn;
    const marks = [], strike = [];
    if (borrowIn) strike.push(i);
    let borrowed = false;
    if (top < y) { top += 10; borrowed = true; }
    if (borrowIn || borrowed) marks.push({ place: i, value: top });
    const d = top - y;
    let note = `${PLACE[i]}: ${top} − ${y} = ${d}`;
    if (borrowed) note = `${PLACE[i]}: 모자라서 앞자리에서 10을 빌려 와요 → ${note.split(': ')[1]}`;
    steps.push({ place: i, digit: i >= len && d === 0 ? null : d, marks, strike, note });
    borrowIn = borrowed ? 1 : 0;
  }
  return { kind: 'column', op: '−', a, b, width: da.length, steps, answer };
}

// 곱셈: 두 자리×한 자리는 앞 수를, 그 외에는 뒤 수를 자리값으로 나눈다
function mulLines(a, b) {
  const lines = [];
  let parts;
  if (b < 10) {
    parts = splitPlaces(a).map((x) => ({ text: `${x} × ${b} = ${x * b}`, value: x * b }));
  } else {
    parts = splitPlaces(b).map((x) => ({ text: `${a} × ${x} = ${a * x}`, value: a * x }));
  }
  const big = b < 10 ? a : b;
  lines.push({ text: `자리별로 나눠요: ${big} = ${splitPlaces(big).join(' + ')}`, kind: 'note' });
  for (const pt of parts) lines.push({ text: pt.text });
  if (parts.length > 1) lines.push({ text: `${parts.map((pt) => pt.value).join(' + ')} = ${a * b}`, kind: 'final' });
  else lines[lines.length - 1].kind = 'final';
  return { kind: 'lines', lines, answer: a * b };
}

// 나눗셈: 몫이 한 자리면 곱셈으로 맞춰 보고, 두 자리면 십/일로 나눠 뺀다
function divLines(a, b) {
  const q = a / b;
  const lines = [];
  if (q < 10) {
    lines.push({ text: `${b} × 몇 = ${a} 인지 찾아봐요`, kind: 'note' });
    // 몫은 2 이상이라 한 칸 작은 수부터 보여 준다
    lines.push({ text: `${b} × ${q - 1} = ${b * (q - 1)}  조금 모자라요` });
    lines.push({ text: `${b} × ${q} = ${a}  딱 맞아요!`, kind: 'final' });
    return { kind: 'lines', lines, answer: q };
  }
  let rest = a;
  const qs = [];
  lines.push({ text: `${a}에서 ${b}씩 크게 덜어 내요`, kind: 'note' });
  for (let p = String(q).length - 1; p >= 0; p--) {
    const unit = 10 ** p;
    const k = Math.floor(rest / (b * unit));
    if (!k) continue;
    const take = b * k * unit;
    rest -= take;
    qs.push(k * unit);
    lines.push({ text: `${b} × ${k * unit} = ${take}  → 남은 수 ${rest}` });
  }
  lines.push({ text: `몫 = ${qs.join(' + ')} = ${q}`, kind: 'final' });
  return { kind: 'lines', lines, answer: q };
}

// 345 → [300, 40, 5] (0인 자리는 뺌)
function splitPlaces(n) {
  const ds = digits(n);
  const out = [];
  for (let i = ds.length - 1; i >= 0; i--) if (ds[i]) out.push(ds[i] * 10 ** i);
  return out;
}
