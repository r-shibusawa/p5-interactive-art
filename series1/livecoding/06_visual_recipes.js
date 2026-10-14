// ===== 06 映像レシピ：回転する光 =====
// colorMode(HSB) と rotate を使った映像。音楽に合わせて回転・変色する

bpm(128)

drum('kick',  'x...x...x...x...')
drum('clap',  '....x.......x...')
drum('hat',   'x.xxx.xxx.xxx.xx', 0.5)
synth('bass', 'E2 . E2 E2 . . E2 . G2 . G2 G2 . . D2 .', { wave: 'square', cutoff: 500 })

let angle = 0

visual(v => {
  background(0, 30)
  colorMode(HSB, 360, 100, 100, 100)
  translate(width * 0.65, height / 2)

  angle += 0.01 + v.kick * 0.08         // キックで回転が速くなる
  rotate(angle)

  let n = 12                            // 光の本数
  for (let i = 0; i < n; i++) {
    rotate(TWO_PI / n)
    let h = (v.t * 30 + i * 30) % 360   // 時間とともに色が変わる
    stroke(h, 80, 100)
    strokeWeight(2 + v.clap * 10)
    line(0, 0, 150 + v.kick * 200, 0)
    noStroke()
    fill(h, 60, 100)
    circle(200 + v.note * 60, 0, 12 + v.hat * 20)
  }
})

// ---------- やってみよう ----------
// 1. n を 5 や 30 にしてみよう
// 2. line を rect や triangle に変えてみよう
