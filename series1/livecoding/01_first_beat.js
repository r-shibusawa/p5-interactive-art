// ===== 01 はじめてのビート =====
// x = 鳴らす  . = 休み   1文字 = 16分音符1つ（16文字で1小節）
// 書きかえたら Ctrl + Enter（Mac は ⌘ + Enter）→ 音を止めずに切りかわる！

// ※ これはレシピです。sketch.js ではなく、14 のスタジオの左の黒い欄に貼って Ctrl + Enter（Mac は ⌘ + Enter）
if (typeof bpm === 'undefined') throw new Error('これはライブコーディングのレシピです。sketch.js には 14 のスタジオを貼って ▶、このレシピはスタジオ左の黒い欄に貼って Ctrl + Enter（Mac は ⌘ + Enter）で動かします');

bpm(110)

drum('kick', 'x...x...x...x...')
drum('hat',  '..x...x...x...x.')

scene('pulse')

// ---------- やってみよう ----------
// 1. kick の . を x に変えてみよう（例 'x...x...x..xx...'）
// 2. bpm を 90 や 140 にしてみよう
// 3. 行の先頭に // をつけると、その楽器だけ止まる
