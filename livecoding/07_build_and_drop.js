// ===== 07 展開をつくる（ビルドアップ → ドロップ）=====
// ライブコーディングの演奏は「少しずつ足して、引いて」盛り上げる
// 下の // を1つずつ消して Ctrl + Enter → 曲がだんだん盛り上がる！
// 最後は ① 〜 ③ をまとめて // に戻して…「ドロップ」で一気に解放

bpm(126)

// --- STEP A：静かに始める ---
synth('pad', 'D3 . . . . . . . A2 . . . . . . .', { wave: 'triangle', len: 2, vol: 0.2 })

// --- STEP B：リズムが入る ---
// drum('hat', '..x...x...x...x.')
// drum('kick', 'x.......x.......')

// --- STEP C：盛り上げる（① ② ③）---
// drum('snare', 'x.x.x.x.x.x.x.x.')                     // ①
// drum('clap',  'xxxxxxxxxxxxxxxx', 0.5)                // ②
// synth('rise', 'D5 E5 F5 G5 A5 B5 C6 D6', { wave: 'sawtooth', vol: 0.1, len: 0.1 })  // ③

// --- STEP D：ドロップ！（① ② ③ を // に戻してから、ここを消す）---
// drum('kick', 'X...x...X...x...')
// drum('snare', '....x.......x...')
// synth('bass', 'D2 . D2 D3 . D2 . . F2 . F2 F3 . C2 . C3', { wave: 'sawtooth', cutoff: 900, vol: 0.4 })

scene('pulse')

// Ctrl + .（ピリオド）で全部止まる → 拍手！
