// ===== 02 ドラムパターンをつくる =====
// 使えるドラム： kick（バスドラム） snare（スネア） hat（ハイハット） clap（手拍子）
// X（大文字）= 強く鳴らす

// ※ これはレシピです。sketch.js ではなく、14 のスタジオの左の黒い欄に貼って Ctrl + Enter（Mac は ⌘ + Enter）
if (typeof bpm === 'undefined') throw new Error('これはライブコーディングのレシピです。sketch.js には 14 のスタジオを貼って ▶、このレシピはスタジオ左の黒い欄に貼って Ctrl + Enter（Mac は ⌘ + Enter）で動かします');

bpm(124)

drum('kick',  'X...x...X...x...')
drum('snare', '....x.......x...')
drum('hat',   'x.x.x.x.x.xXx.x.')
drum('clap',  '............x..x')

scene('grid')

// ---------- やってみよう ----------
// 1. パターンの長さを変えると「ずれ」が生まれて面白い
//    drum('clap', 'x..')   ← 3つでくり返す（ポリリズム）
// 2. 4つ目の数字で音量を変えられる  drum('hat', 'x.x.x.x.', 0.5)
