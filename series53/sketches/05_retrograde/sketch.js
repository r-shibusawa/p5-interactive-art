// ============================================
// 05 惑星の逆行 ─ 火星がときどき「後もどり」して見えるのはなぜ？
// 04 と同じ軌道要素で地球と火星の位置を計算し、地球から見た黄経 λ・黄緯 β を星空の上に描く
// 地球が内側から火星を追いこす「衝」のころだけ、λ が減る（西へもどる）＝ 逆行
// P = プトレマイオスの周転円（円軌道の近似）を重ねる：周転円の半径 = 地球の軌道、回る速さ = 太陽 → 地動説と同じ見え方
// ←→ = 前・次の衝 / 1 火星 2 木星 3 土星 / スペース = 再生/停止 / P = 周転円 / T = 今日に近い衝
// ============================================

const PL = [['Mars', '火星', 220], ['Jupiter', '木星', 200], ['Saturn', '土星', 200]];   // 名前と、衝の前後に描く日数
let pi = 0, jdOpp, t0 = 0, playing = true, epi = true, track = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  selfTest();
  jdOpp = nextOpposition('Mars', jdNowUT() - 400);
  makeTrack();
}
// 衝からのずれ：地球から見た惑星と太陽の黄経の差 − 180°（0 になる日が衝）
function oppOff(name, jd) { return wrap180(geoLonLat(name, jd)[0] - sunGeoLon(jd) - 180); }
function nextOpposition(name, jd) {
  for (let k = 0; k < 400; k++) {
    let a = jd + k * 5, b = a + 5;
    if (oppOff(name, a) > 0 && oppOff(name, b) <= 0) {        // + から − に変わったら二分法（衝の前後で離角は減っていく）
      for (let i = 0; i < 40; i++) { let m = (a + b) / 2; if (oppOff(name, m) > 0) a = m; else b = m; }
      return (a + b) / 2;
    }
  }
  return jd;
}
function prevOpposition(name, jd) { let syn = 365.25 / (1 - 1 / periodYr(name)); return nextOpposition(name, jd - syn - 30) < jd - 1 ? nextOpposition(name, jd - syn - 30) : jd; }
// 円軌道で近似した 2 つの見方（同じ答えになる）
function meanLon(name, jd) { let [p0, dp] = ELEM[name]; return (p0[3] + (dp[3] * (jd - 2451545)) / 36525) * DEG; }
function lonHelioCircle(name, jd) {    // 地動説：惑星の位置 − 地球の位置
  let a = ELEM[name][0][0], L = meanLon(name, jd), Le = meanLon('Earth', jd);
  return wrap360(Math.atan2(a * Math.sin(L) - Math.sin(Le), a * Math.cos(L) - Math.cos(Le)) / DEG);
}
function lonEpicycle(name, jd) {       // 天動説：導円（半径 a、惑星の速さ）＋ 周転円（半径 1、太陽の向きと平行）
  let a = ELEM[name][0][0], L = meanLon(name, jd), S = meanLon('Earth', jd) + Math.PI;
  let x = a * Math.cos(L) + Math.cos(S), y = a * Math.sin(L) + Math.sin(S);
  return wrap360(Math.atan2(y, x) / DEG);
}
function makeTrack() {
  let [name, , span] = PL[pi]; track = [];
  for (let d = -span; d <= span; d += 2) { let j = jdOpp + d, ll = geoLonLat(name, j); track.push({ d, j, lam: ll[0], bet: ll[1], epi: lonEpicycle(name, j), E: planetPos('Earth', j), P: planetPos(name, j) }); }
  for (let i = 0; i < track.length; i++) { let a = track[Math.max(0, i - 1)], b = track[Math.min(track.length - 1, i + 1)]; track[i].retro = wrap180(b.lam - a.lam) < 0; }
  t0 = 0;
}

function draw() {
  background(6, 10, 28);
  let [name, jp, span] = PL[pi];
  if (playing) t0 = (t0 + 0.5) % track.length;
  let cur = track[Math.floor(t0)], lam0 = track[Math.floor(track.length / 2)].lam;
  // ---- 太陽中心の図（視線を外の「星空の円」までのばす）
  let cx = width * 0.22, cy = height * 0.53, R = Math.min(width * 0.17, height * 0.34), aP = ELEM[name][0][0], sc = (R * 0.8) / Math.max(1.7, aP * 1.1);
  stroke(60, 70, 110); noFill(); circle(cx, cy, 2 * R * 1.12);
  noStroke(); fill(255, 210, 90); circle(cx, cy, 14);
  for (let i = 0; i < track.length; i += 10) {
    let e = track[i].E, p = track[i].P, dx = p[0] - e[0], dy = p[1] - e[1], L = Math.hypot(dx, dy);
    // 地球から惑星の向きへのばした線が、外の円（星空）と交わる点まで：|e + k·d| = Rc を k について解く
    let Rc = (R * 1.12) / sc, ux = dx / L, uy = dy / L, bq = e[0] * ux + e[1] * uy, k = -bq + Math.sqrt(Math.max(0, bq * bq - (e[0] ** 2 + e[1] ** 2 - Rc * Rc)));
    let ex = cx + e[0] * sc, ey = cy - e[1] * sc;
    stroke(track[i].retro ? color(255, 120, 100, 150) : color(150, 170, 230, 70)); line(ex, ey, ex + ux * k * sc, ey - uy * k * sc);
  }
  for (let k of ['E', 'P']) { stroke(k === 'E' ? color(90, 150, 240) : color(230, 120, 90)); strokeWeight(2); polyline(track.map((q) => [cx + q[k][0] * sc, cy - q[k][1] * sc])); strokeWeight(1); }
  let e = cur.E, p = cur.P;
  noStroke(); fill(90, 150, 240); circle(cx + e[0] * sc, cy - e[1] * sc, 14); fill(230, 120, 90); circle(cx + p[0] * sc, cy - p[1] * sc, 14);
  stroke(255, 230, 160); line(cx + e[0] * sc, cy - e[1] * sc, cx + p[0] * sc, cy - p[1] * sc);
  noStroke(); fill(200, 205, 225); textSize(13); textAlign(CENTER); text('太陽中心（真上から）。赤い視線 = 逆行中', cx, cy + R * 1.12 + 26); textAlign(LEFT, BASELINE);

  // ---- 星空の上の動き（λ は左ほど大きい：南の空を見たときの東）
  let gx = width * 0.47, gw = width - gx - 30, gy = 110, gh = height * 0.3;
  let lams = track.map((q) => wrap180(q.lam - lam0)), w = Math.max(10, Math.max(...lams.map(Math.abs)) * 1.1);
  let bs = track.map((q) => q.bet), bm = Math.max(1, Math.max(...bs.map(Math.abs)) * 1.3);
  let X = (l) => gx + gw / 2 - (wrap180(l - lam0) / w) * (gw / 2), Yb = (b) => gy + gh / 2 - (b / bm) * (gh / 2);
  stroke(70, 80, 120); noFill(); rect(gx, gy, gw, gh);
  for (let i = 1; i < track.length; i++) { stroke(track[i].retro ? color(255, 120, 100) : color(230, 210, 160)); strokeWeight(2.5); line(X(track[i - 1].lam), Yb(track[i - 1].bet), X(track[i].lam), Yb(track[i].bet)); }
  strokeWeight(1); noStroke(); fill(255); circle(X(cur.lam), Yb(cur.bet), 12);
  fill(200, 205, 225); textSize(13);
  text('星空の上の' + jp + '（黄経 λ ← 東　西 →、縦は黄緯 β を ' + (gh / 2 / bm).toFixed(0) + ' 倍）', gx, gy - 8);
  for (let i = 0; i < track.length; i += 30) { fill(160, 170, 200); textSize(11); text(dateStr(track[i].j).slice(0, 7), X(track[i].lam) - 20, Yb(track[i].bet) + (i % 60 ? 18 : -10)); }

  // ---- λ と時間（逆行は赤）。P で周転円の近似を重ねる
  let gy2 = gy + gh + 60, gh2 = height - gy2 - 70, Yl = (l) => gy2 + gh2 / 2 - (wrap180(l - lam0) / w) * (gh2 / 2), Xd = (d) => gx + ((d + span) / (2 * span)) * gw;
  stroke(70, 80, 120); noFill(); rect(gx, gy2, gw, gh2);
  for (let i = 1; i < track.length; i++) { stroke(track[i].retro ? color(255, 120, 100) : color(230, 210, 160)); strokeWeight(2.5); line(Xd(track[i - 1].d), Yl(track[i - 1].lam), Xd(track[i].d), Yl(track[i].lam)); }
  if (epi) { stroke(140, 220, 200, 200); strokeWeight(1.5); polyline(track.map((q) => [Xd(q.d), Yl(q.epi)])); }
  strokeWeight(1); stroke(255, 120); line(Xd(cur.d), gy2, Xd(cur.d), gy2 + gh2);
  let st = stations(track);
  noStroke(); fill(200, 205, 225); textSize(13);
  text('地球から見た黄経 λ（縦）と日付（横、まん中 = 衝 ' + dateStr(jdOpp) + '）' + (epi ? '　緑 = 周転円の近似（円軌道）' : ''), gx, gy2 - 8);
  fill(255, 150, 130); textSize(14);
  if (st.length === 2) text('逆行：' + dateStr(st[0]) + ' 〜 ' + dateStr(st[1]) + '（' + (st[1] - st[0]).toFixed(0) + ' 日間）　会合周期 1 / (1 − 1/T) = ' + (365.25 / (1 - 1 / periodYr(name))).toFixed(1) + ' 日', gx, gy2 + gh2 + 24);
  if (epi) drawEpicycle(gx + 60, gy2 + 60, 42, name, cur.j);

  noStroke(); fill(240, 236, 215); textSize(18);
  text('惑星の逆行　｜ ←→ 前・次の衝　1 火星 2 木星 3 土星　スペース 再生/停止　P 周転円　T 今日', 20, 34);
  fill(250, 225, 140); textSize(16);
  text(dateStr(cur.j) + '　' + jp + 'の黄経 λ = ' + cur.lam.toFixed(2) + '°　黄緯 β = ' + cur.bet.toFixed(2) + '°　' + (cur.retro ? '逆行中（西へ）' : '順行（東へ）'), 20, 60);
  drawSelfTest(20, height - 12);
}
// 周転円の小さな図：地球が中心、導円の上を回る点のまわりを惑星が回る
function drawEpicycle(x, y, r, name, j) {
  let a = ELEM[name][0][0], s = r / (a + 1), L = meanLon(name, j), S = meanLon('Earth', j) + Math.PI;
  stroke(140, 220, 200, 120); noFill(); circle(x, y, 2 * a * s);
  let ex = x + a * s * Math.cos(L), ey = y - a * s * Math.sin(L); circle(ex, ey, 2 * s);
  stroke(140, 220, 200); line(x, y, ex, ey); line(ex, ey, ex + s * Math.cos(S), ey - s * Math.sin(S));
  noStroke(); fill(90, 150, 240); circle(x, y, 8); fill(230, 120, 90); circle(ex + s * Math.cos(S), ey - s * Math.sin(S), 8);
  fill(140, 220, 200); textSize(11); text('周転円（中心 = 地球）', x + r + 8, y);
}
function stations(tr) { let out = []; for (let i = 1; i < tr.length; i++) if (tr[i].retro !== tr[i - 1].retro) out.push(tr[i].j); return out; }

function keyPressed() {
  let name = PL[pi][0];
  if (key === RIGHT_ARROW) jdOpp = nextOpposition(name, jdOpp + 30);
  else if (key === LEFT_ARROW) jdOpp = prevOpposition(name, jdOpp);
  else if (key >= '1' && key <= '3') { pi = +key - 1; jdOpp = nextOpposition(PL[pi][0], jdNowUT() - 400); }
  else if (key === 't' || key === 'T') jdOpp = nextOpposition(name, jdNowUT() - 400);
  if (key === ' ') playing = !playing;
  if (key === 'p' || key === 'P') epi = !epi;
  jdOpp = clampv(jdOpp, 2378496.5 + 400, 2470171.5 - 400);
  if (key !== ' ' && key !== 'p' && key !== 'P') makeTrack();
  return false;
}

// ---- 自己テスト
function selfTest() {
  selfTestResults = [];
  check('火星の会合周期 = 1 / (1 − 1/1.881) 年 ≈ 780 日', near(365.25 / (1 - 1 / periodYr('Mars')), 779.9, 1.5));
  let o = nextOpposition('Mars', jdFromDate(2020, 9, 1));
  check('2020 年の火星の衝は 10 月 13 日（±1 日）', Math.abs(o - jdFromDate(2020, 10, 13.5)) < 1.2);
  let o2 = nextOpposition('Mars', o + 30), o3 = nextOpposition('Mars', o2 + 30);
  check('次の衝は 2022-12-08、その次は 2025-01-16（±2 日）', Math.abs(o2 - jdFromDate(2022, 12, 8)) < 2 && Math.abs(o3 - jdFromDate(2025, 1, 16)) < 2);
  pi = 0; jdOpp = o; makeTrack(); let s = stations(track);
  check('2020 年の逆行は 9 月 9〜10 日から 11 月 13〜14 日、衝はその間', s.length === 2 && s[0] > jdFromDate(2020, 9, 7) && s[0] < jdFromDate(2020, 9, 12) && s[1] > jdFromDate(2020, 11, 11) && s[1] < jdFromDate(2020, 11, 16) && s[0] < o && o < s[1]);
  pi = 1; jdOpp = nextOpposition('Jupiter', jdFromDate(2023, 6, 1)); makeTrack(); let sj = stations(track);
  check('木星の逆行は約 4 か月（110〜130 日）', sj.length === 2 && sj[1] - sj[0] > 110 && sj[1] - sj[0] < 130);
  let worst = 0; for (let k = 0; k < 200; k++) { let j = 2451545 + k * 13.7; worst = Math.max(worst, Math.abs(wrap180(lonEpicycle('Mars', j) - lonHelioCircle('Mars', j)))); }
  check('周転円（天動説）と円軌道の地動説は、同じ方向を指す（差 < 10⁻⁹ 度）', worst < 1e-9);
  pi = 0;
  reportSelfTest();
}

// ---------- やってみよう ----------
// 1. → で次の衝へ。逆行の期間と、逆行の「ループ」の形は毎回同じ？
// 2. 2 の木星、3 の土星にすると、逆行の幅と期間はどう変わる？（遠いほど小さく、長い）
// 3. 左の図の赤い視線が交差するところ = 地球が惑星を追いこしているところ
// 4. P の周転円（緑）と本当の動き（黄・赤）のずれは、どこで大きい？（楕円軌道の効果）
// 5. PL に ['Uranus', '天王星', 200] を足して、もっと遠い惑星の逆行を見よう


// ==================================================
// ここから下は「天文の道具」（中身は読まなくても OK。消さないでね）
// ==================================================
function clampv(v, a, b) { return v < a ? a : v > b ? b : v; }
const DEG = Math.PI / 180;             // 度 → ラジアン
function wrap360(a) { return ((a % 360) + 360) % 360; }
function wrap180(a) { return wrap360(a + 180) - 180; }
function polyline(pts, closed) {       // 点が 2 つ以上あるときだけ折れ線を描く（空の beginShape はエラーになるため）
  if (!pts || pts.length < 2) return;
  noFill(); beginShape(); for (let p of pts) vertex(p[0], p[1]); endShape(closed ? CLOSE : undefined);
}
// ---- 日付 ⇔ ユリウス日 JD（グレゴリオ暦、時刻は世界時 UT。2000-01-01 12:00 UT = 2451545.0）
function jdFromDate(Y, M, D, h) {
  if (M <= 2) { Y -= 1; M += 12; }
  let A = Math.floor(Y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5 + (h || 0) / 24;
}
function dateFromJd(jd) {
  let Z = Math.floor(jd + 0.5), F = jd + 0.5 - Z, al = Math.floor((Z - 1867216.25) / 36524.25);
  let A = Z + 1 + al - Math.floor(al / 4), B = A + 1524, C = Math.floor((B - 122.1) / 365.25), Dd = Math.floor(365.25 * C), E = Math.floor((B - Dd) / 30.6001);
  let D = B - Dd - Math.floor(30.6001 * E), M = E < 14 ? E - 1 : E - 13, Y = M > 2 ? C - 4716 : C - 4715;
  return { Y, M, D, h: F * 24 };
}
function dateStr(jd) { let d = dateFromJd(jd); return d.Y + '-' + String(d.M).padStart(2, '0') + '-' + String(d.D).padStart(2, '0'); }
function jdNowUT() { return 2440587.5 + Date.now() / 86400000; }   // いまの JD（1970-01-01 0:00 UT = 2440587.5）
// ---- 惑星の位置：J2000 の軌道要素（JPL の近似式、1800〜2050 年で誤差は数分角程度）
// [a (AU), e, I (度), L 平均黄経 (度), ϖ 近日点黄経 (度), Ω 昇交点黄経 (度)] と、それぞれの 1 世紀あたりの変化
const ELEM = {
  Mercury: [[0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593], [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
  Venus:   [[0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255], [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]],
  Earth:   [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0], [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]],
  Mars:    [[1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891], [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
  Jupiter: [[5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
  Saturn:  [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
  Uranus:  [[19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503], [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]],
  Neptune: [[30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574], [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.01262724]],
};
// ケプラー方程式 E − e sin E = M をニュートン法で解く（M, E はラジアン）
function solveKepler(M, e) {
  let E = e < 0.8 ? M : (M < 0 ? -Math.PI : Math.PI);   // 最初の値（M は −π〜π）
  for (let i = 0; i < 30; i++) {
    let d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d; if (Math.abs(d) < 1e-13) break;
  }
  return E;
}
// 日付 jd の、太陽を中心とした黄道座標 [x, y, z]（AU）
function planetPos(name, jd) {
  let [p0, dp] = ELEM[name], T = (jd - 2451545.0) / 36525;
  let a = p0[0] + dp[0] * T, e = p0[1] + dp[1] * T, I = (p0[2] + dp[2] * T) * DEG;
  let L = p0[3] + dp[3] * T, w = p0[4] + dp[4] * T, O = (p0[5] + dp[5] * T) * DEG;
  let om = w * DEG - O, M = wrap180(L - w) * DEG, E = solveKepler(M, e);
  let xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  let co = Math.cos(om), so = Math.sin(om), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I);
  return [(co * cO - so * sO * cI) * xp + (-so * cO - co * sO * cI) * yp,
          (co * sO + so * cO * cI) * xp + (-so * sO + co * cO * cI) * yp,
          so * sI * xp + co * sI * yp];
}
function periodYr(name) { return 36000 / ELEM[name][1][3]; }   // 公転周期 [年] = 360° ÷ 平均黄経の変化（1 年あたり）
// 地球から見た黄経・黄緯 [度]
function geoLonLat(name, jd) {
  let p = planetPos(name, jd), q = planetPos('Earth', jd), x = p[0] - q[0], y = p[1] - q[1], z = p[2] - q[2];
  return [wrap360(Math.atan2(y, x) / DEG), Math.atan2(z, Math.hypot(x, y)) / DEG];
}
function sunGeoLon(jd) { let q = planetPos('Earth', jd); return wrap360(Math.atan2(-q[1], -q[0]) / DEG); }
// ---- 自己テストの道具
let selfTestResults = [];
function check(name, cond) { selfTestResults.push({ name, ok: !!cond }); }
function near(a, b, tol) { return a !== null && a !== undefined && isFinite(a) && Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); }
function reportSelfTest() { for (let r of selfTestResults) (r.ok ? console.log : console.error)((r.ok ? '✓ ' : '✗ ') + r.name); }
function selfTestLine() { let n = selfTestResults.filter((r) => r.ok).length; return '自己テスト ' + (n === selfTestResults.length ? '✓ ' : '✗ ') + n + ' / ' + selfTestResults.length; }
function drawSelfTest(x, y) { noStroke(); textSize(13); textAlign(LEFT, BASELINE); fill(selfTestResults.every((r) => r.ok) ? color(130, 215, 160) : color(255, 95, 95)); text(selfTestLine(), x, y); }
