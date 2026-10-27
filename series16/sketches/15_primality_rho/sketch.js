// ============================================
// 15 素数判定と素因数分解：ミラー–ラビンとポラードのロー
// 1〜4：ミラー–ラビン法。a^(n−1) ≢ 1 なら n は合成数（フェルマー）。
//       それをすり抜ける「うそつき」もいる（カーマイケル数 561 など）ので、途中に「1 の自明でない平方根」がないかも調べる
//       マス = 底 a。赤 = 合成数だと見破った（証人）、緑 = だまされた（うそつき）。マウスを乗せると計算の中身
// 5・6：ポラードのロー法。xᵢ₊₁ = xᵢ² + 1 mod n の数列は、隠れた素因数 p で見ると ρ の形でループする
// 1：561（カーマイケル数）2：341（2 にだまされる）3：97（素数）4：ランダム ←→：n を 2 ずつ T：フェルマー／MR の表示切りかえ
// 5：n = 4307 6：n = 247021　スペース：ロー法を 1 歩 / A：自動
// ============================================

let speed = 25; // ★ ロー法の自動再生の間隔

let mode = 'mr', n = 561, view = 'mr', cache = [], cacheN = 0;
let rn = 4307, xs = [], rhoI = 1, rhoK = 2, rhoY = 2, found = null, rhoLog = [], auto = false, timer = 0;

function setup() { createCanvas(windowWidth, windowHeight); textWrap(CHAR); initRho(); }

function modPow(a, b, m) { let r = 1n, A = BigInt(a) % BigInt(m), B = BigInt(b), M = BigInt(m); while (B > 0n) { if (B & 1n) r = (r * A) % M; A = (A * A) % M; B >>= 1n; } return Number(r); }
function gcd(x, y) { x = abs(x); y = abs(y); while (y) [x, y] = [y, x % y]; return x; }
function isPrime(x) { if (x < 2) return false; for (let k = 2; k * k <= x; k++) if (x % k === 0) return false; return true; }
// 証人かどうか調べる：n−1 = 2ᵗu と分けて、a^u から 2 乗を t 回くり返す
function witness(a, m) {
  let t = 0, u = m - 1; while (u % 2 === 0) { u /= 2; t++; }
  let seq = [modPow(a, u, m)], why = null;
  for (let i = 1; i <= t; i++) {
    let x = Number((BigInt(seq[i - 1]) * BigInt(seq[i - 1])) % BigInt(m));
    if (x === 1 && seq[i - 1] !== 1 && seq[i - 1] !== m - 1 && !why) why = `${seq[i - 1]}² ≡ 1 なのに ${seq[i - 1]} ≢ ±1 → 1 の自明でない平方根 → 合成数`;
    seq.push(x);
  }
  if (!why && seq[t] !== 1) why = `a^(n−1) ≡ ${seq[t]} ≢ 1 → フェルマーの小定理に反する → 合成数`;
  return { t, u, seq, isW: !!why, why };
}

function draw() {
  background(18, 14, 26);
  fill(235); noStroke(); textSize(26); textAlign(LEFT, BASELINE);
  text(mode === 'mr' ? `ミラー–ラビン法：${n} は素数？` : `ポラードのロー法：${rn} を素因数分解`, 30, 50);
  textSize(15); fill(150);
  text('1：561　2：341　3：97　4：ランダム　←→：n±2　T：フェルマー/MR　｜　5：4307　6：247021　スペース：ロー法 1 歩　A：自動' + (auto ? '（中）' : ''), 30, 80);
  if (mode === 'mr') drawMR(); else drawRho();
}

function drawMR() {
  let cnt = n - 1, cols = ceil(sqrt(cnt * 1.4)), rows = ceil(cnt / cols);
  let cs = min((width * 0.56) / cols, (height - 150) / rows), ox = 30, oy = 110, hover = null;
  let fl = 0, ml = 0;
  if (cacheN !== n) { cacheN = n; cache = []; for (let a = 1; a < n; a++) cache[a] = witness(a, n); } // n が変わったときだけ計算
  for (let a = 1; a < n; a++) {
    let w = cache[a], fermatLiar = w.seq[w.t] === 1;
    if (fermatLiar) fl++; if (!w.isW) ml++;
    let liar = view === 'mr' ? !w.isW : fermatLiar;
    let i = a - 1, x = ox + (i % cols) * cs, y = oy + floor(i / cols) * cs;
    fill(liar ? color(78, 225, 190) : color(255, 95, 109, 200)); noStroke(); rect(x, y, cs - 1, cs - 1, 2);
    if (mouseX >= x && mouseX < x + cs && mouseY >= y && mouseY < y + cs) { hover = { a, w }; stroke(255); strokeWeight(2); noFill(); rect(x, y, cs - 1, cs - 1); }
  }
  let px = ox + cols * cs + 30, pw = width - px - 30, yy = 112;
  textAlign(LEFT, TOP); noStroke(); textSize(18);
  fill(isPrime(n) ? color(78, 225, 190) : color(255, 95, 109));
  text(`${n} は本当は ${isPrime(n) ? '素数' : '合成数（' + factorStr(n) + '）'}`, px, yy); yy += 34;
  textSize(16); fill(235); text(`表示：${view === 'mr' ? 'ミラー–ラビン' : 'フェルマー'}（T で切りかえ）`, px, yy); yy += 30;
  fill(200); text(`フェルマーのうそつき：${fl} / ${n - 1}（${((100 * fl) / (n - 1)).toFixed(1)}%）`, px, yy); yy += 26;
  text(`ミラー–ラビンのうそつき：${ml} / ${n - 1}（${((100 * ml) / (n - 1)).toFixed(1)}%）`, px, yy); yy += 34;
  fill(150); textSize(14);
  text(isPrime(n) ? '素数なら全部の a がうそつき（全部緑）。証人が 1 つも見つからない。' : 'ミラー–ラビンでは、合成数ならうそつきは多くても半分（実際は 1/4 以下）。ランダムな a を s 回試してだまされる確率は 2⁻ˢ 以下。', px, yy, pw); yy += 70;
  if (hover) {
    let { a, w } = hover;
    fill(235); textSize(16); text(`a = ${a}：n − 1 = ${n - 1} = 2^${w.t} × ${w.u}`, px, yy); yy += 28;
    textSize(15);
    for (let i = 0; i < w.seq.length; i++) { fill(w.seq[i] === 1 ? color(78, 225, 190) : w.seq[i] === n - 1 ? color(255, 200, 90) : color(200)); text(`a^(${w.u}·2^${i}) mod ${n} = ${w.seq[i]}${w.seq[i] === n - 1 ? '（= −1）' : ''}`, px + 10, yy); yy += 22; }
    fill(w.isW ? color(255, 95, 109) : color(78, 225, 190)); yy += 6;
    text(w.isW ? w.why : '最後が 1 で、その直前は ±1 → 矛盾なし（素数のふりができた）', px, yy, pw);
  } else { fill(150); textSize(15); text('マスにマウスを乗せると、その a での計算が見られる', px, yy, pw); }
}
function factorStr(m) { let f = [], k = 2; while (m > 1) { if (m % k === 0) { f.push(k); m /= k; } else k++; } return f.join(' × '); }

function initRho() {
  xs = [2]; rhoI = 1; rhoK = 2; rhoY = 2; found = null; rhoLog = [];
}
// ロー法の 1 歩：xᵢ = xᵢ₋₁² + 1、i が 2 の累乗のとき y を保存、gcd(y − xᵢ, n) を調べる
function rhoStep() {
  if (found) return;
  rhoI++;
  let x = Number((BigInt(xs[xs.length - 1]) * BigInt(xs[xs.length - 1]) + 1n) % BigInt(rn)); xs.push(x);
  let d = gcd(rhoY - x, rn);
  rhoLog.push({ i: rhoI, x, y: rhoY, d });
  if (d !== 1 && d !== rn) found = d;
  if (rhoI === rhoK) { rhoY = x; rhoK *= 2; }
}

function drawRho() {
  if (auto && !found && ++timer % speed === 0) rhoStep();
  let p = smallestFactor(rn);
  // xᵢ mod p で ρ の形を作る：しっぽ（最初の重複まで）とループ
  let mods = [], seen = {}, cycleStart = -1, all = [2];
  for (let i = 0; i < 200; i++) { let v = all[i] % p; if (seen[v] !== undefined) { cycleStart = seen[v]; break; } seen[v] = i; mods.push(v); all.push(Number((BigInt(all[i]) * BigInt(all[i]) + 1n) % BigInt(rn))); }
  let tail = cycleStart, loopLen = mods.length - cycleStart;
  let cx = width * 0.3, cy = height * 0.38, R = min(height * 0.22, 22 * loopLen / PI + 30), pos = [];
  let gap = min(50, (height - 110 - cy - R) / max(1, tail));
  for (let i = 0; i < mods.length; i++) {
    if (i < tail) pos.push([cx, cy + R + gap * (tail - i)]);
    else { let ang = HALF_PI + (TWO_PI * (i - tail)) / loopLen; pos.push([cx + cos(ang) * R, cy + sin(ang) * R]); }
  }
  stroke(70, 60, 95); strokeWeight(2);
  for (let i = 1; i < mods.length; i++) line(pos[i - 1][0], pos[i - 1][1], pos[i][0], pos[i][1]);
  if (loopLen > 0) line(pos[mods.length - 1][0], pos[mods.length - 1][1], pos[tail][0], pos[tail][1]);
  let cur = xs.length - 1, yIdx = rhoK / 2 - 1;
  for (let i = 0; i < mods.length; i++) {
    let visited = i <= cur || (cur >= mods.length);
    noStroke(); fill(visited ? color(255, 200, 90) : color(60, 52, 80)); circle(pos[i][0], pos[i][1], min(30, gap * 0.9 + 6, (TWO_PI * R) / loopLen * 0.85));
    fill(18, 14, 26); textAlign(CENTER, CENTER); textSize(12); text(mods[i], pos[i][0], pos[i][1]);
  }
  let ci = cur < mods.length ? cur : tail + ((cur - tail) % loopLen), yi = yIdx < mods.length ? yIdx : tail + ((yIdx - tail) % loopLen);
  noFill(); strokeWeight(4); stroke(255, 95, 109); circle(pos[ci][0], pos[ci][1], 40); stroke(78, 225, 190); circle(pos[yi][0], pos[yi][1], 48);
  noStroke(); fill(200); textSize(14); textAlign(CENTER, TOP);
  text(`xᵢ mod ${p}（隠れた素因数 p で見た数列）：しっぽ ${tail}、ループ ${loopLen}`, cx, height - 70);
  fill(255, 95, 109); text('赤 = いまの xᵢ', cx - 90, height - 46); fill(78, 225, 190); text('緑 = 保存した y', cx + 90, height - 46);

  let px = width * 0.58, pw = width - px - 30, yy = 112;
  textAlign(LEFT, TOP); textSize(16); fill(235);
  text(`n = ${rn}、x₁ = 2、xᵢ = xᵢ₋₁² + 1 mod n`, px, yy); yy += 30;
  textSize(14); fill(150); ['i', 'xᵢ', 'y', 'gcd(y − xᵢ, n)'].forEach((h, j) => text(h, px + [0, 50, 140, 230][j], yy)); yy += 22;
  let rows = rhoLog.slice(-14);
  for (let r of rows) { fill(r.d !== 1 ? color(255, 200, 90) : color(200)); text(r.i, px, yy); text(r.x, px + 50, yy); text(r.y, px + 140, yy); text(r.d, px + 230, yy); yy += 20; }
  yy += 14;
  textSize(17);
  if (found) { fill(78, 225, 190); text(`見つけた！ ${rn} = ${found} × ${rn / found}（${rhoI} 歩）`, px, yy, pw); }
  else { fill(235); text('スペースで 1 歩（A で自動）', px, yy, pw); }
  yy += 40; fill(150); textSize(14);
  text(`mod p の世界では値が p 個しかないので、誕生日のパラドックスにより約 √p 歩で同じ値に戻る（ρ の形）。\n赤と緑が同じ丸に来ると y ≡ xᵢ (mod p) → y − xᵢ は p の倍数 → gcd に p が出てくる。p を知らなくても！\n試し割りの約 √n 回に対して、ロー法は約 √p ≤ n^(1/4) 回。`, px, yy, pw);
}
function smallestFactor(m) { for (let k = 2; k * k <= m; k++) if (m % k === 0) return k; return m; }

function keyPressed() {
  if (key >= '1' && key <= '4') { mode = 'mr'; n = [561, 341, 97, 0][int(key) - 1]; if (!n) { n = floor(random(50, 500)) * 2 + 1; } }
  if (key === RIGHT_ARROW && mode === 'mr') n = min(1201, n + 2);
  if (key === LEFT_ARROW && mode === 'mr') n = max(5, n - 2);
  if (key === 't' || key === 'T') view = view === 'mr' ? 'fermat' : 'mr';
  if (key === '5') { mode = 'rho'; rn = 4307; initRho(); }
  if (key === '6') { mode = 'rho'; rn = 247021; initRho(); }
  if (key === ' ' && mode === 'rho') rhoStep();
  if (key === 'a' || key === 'A') auto = !auto;
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ---------- やってみよう ----------
// 1. 561 = 3 × 11 × 17 は、フェルマーでは互いに素な a 全部がうそつき。ミラー–ラビンでは？
// 2. ←→ で n を動かして、緑が多い合成数を探す（強い擬素数）
// 3. ロー法の x²+1 を x²+3 に変えると、ρ の形や歩数はどう変わる？
