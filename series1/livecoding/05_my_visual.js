// ===== 05 映像を自分で書く =====
// visual(v => { ... }) の中に p5.js のコードを書くと、それが毎フレーム描かれる
// v の中身：
//   v.kick v.snare v.hat v.clap v.note … その音が鳴ると 1、だんだん 0 に戻る
//   v.step（0〜15） v.beat（0〜3） v.bar（小節） v.t（秒） v.level（音量 0〜1）

bpm(120)

drum('kick',  'x...x...x...x...')
drum('snare', '....x.......x...')
drum('hat',   '..x...x...x...x.')

visual(v => {
  background(10, 10, 30, 60)           // 半透明 → 残像
  noStroke()

  // キックで大きくなる円
  fill(255, 80, 150)
  circle(width * 0.65, height / 2, 100 + v.kick * 300)

  // スネアで光る四角
  fill(0, 220, 255, 255 * v.snare)
  rectMode(CENTER)
  rect(width * 0.65, height / 2, 500, 20)

  // ハイハットで星が散る
  fill(255)
  for (let i = 0; i < 20 * v.hat; i++) {
    circle(random(width * 0.4, width), random(height), 4)
  }
})

// ---------- やってみよう ----------
// 1. 円の色や大きさを変えよう
// 2. v.beat を使って、拍ごとに位置を変えよう
//    例） circle(width * 0.5 + v.beat * 100, height / 2, 100 + v.kick * 300)
