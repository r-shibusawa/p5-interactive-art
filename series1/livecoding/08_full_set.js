// ===== 08 フルセット（ライブ演奏のお手本）=====
// 音楽と映像がそろった完成形。ここから自由に壊して・作りかえよう

bpm(122)

// ---- リズム ----
drum('kick',  'X...x...X...x..x')
drum('snare', '....x.......x...')
drum('hat',   'x.x.x.xxx.x.x.xx', 0.6)
drum('clap',  '............x...', 0.7)

// ---- ベースとメロディ ----
synth('bass', 'F1 . F2 . F1 . . F2 G#1 . G#2 . A#1 . C2 .', { wave: 'sawtooth', cutoff: 800, vol: 0.4 })
synth('lead', 'C5 ? . ? G#4 ? . . F4 ? . ? A#4 . ? .', { wave: 'square', cutoff: 3000, vol: 0.12, len: 0.12 })
synth('pad',  'F3 . . . . . . . C#3 . . . . . . .', { wave: 'triangle', len: 2, vol: 0.15 })

// ---- 映像 ----
let ring = []   // 広がる輪

visual(v => {
  background(5, 5, 15, 50)
  colorMode(HSB, 360, 100, 100, 100)
  let cx = width * 0.65
  let cy = height / 2

  // キックのたびに輪を足す
  if (v.kick > 0.95) ring.push({ r: 50, h: (v.bar * 40) % 360 })

  noFill()
  for (let i = ring.length - 1; i >= 0; i--) {
    let o = ring[i]
    o.r += 8
    stroke(o.h, 70, 100, 100 - o.r / 8)
    strokeWeight(4)
    circle(cx, cy, o.r)
    if (o.r > 800) ring.splice(i, 1)
  }

  // 16ステップの点が回る
  noStroke()
  for (let i = 0; i < 16; i++) {
    let a = map(i, 0, 16, 0, TWO_PI) - HALF_PI
    let on = i === v.step
    fill(on ? 0 : 200, on ? 0 : 60, 100)
    circle(cx + cos(a) * 180, cy + sin(a) * 180, on ? 24 + v.note * 20 : 8)
  }

  // スネアで画面がフラッシュ
  fill(0, 0, 100, v.snare * 25)
  rect(0, 0, width, height)
})
