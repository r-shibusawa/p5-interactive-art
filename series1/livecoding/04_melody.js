// ===== 04 メロディとランダム =====
// ? = パターンの中の音から、毎回ランダムに1つ選んで鳴らす
// 名前を変えれば、synth をいくつでも重ねられる

bpm(118)

drum('kick',  'x...x...x...x...')
drum('snare', '....x.......x...')
drum('hat',   'x.x.x.x.x.x.x.x.', 0.6)

synth('bass', 'A1 . . A1 . . A1 . F1 . . F1 . . G1 .', { wave: 'sawtooth', cutoff: 700 })

// メロディ（ペンタトニック音階からランダム）
synth('lead', 'A4 ? . C5 ? . E5 ? . G5 ? . ? . ? .', { wave: 'square', cutoff: 2500, vol: 0.15, len: 0.15 })

// 和音っぽい長い音（パッド）
synth('pad1', 'A3 . . . . . . . F3 . . . . . . .', { wave: 'triangle', len: 1.5, vol: 0.15 })
synth('pad2', 'C4 . . . . . . . A3 . . . . . . .', { wave: 'triangle', len: 1.5, vol: 0.15 })

scene('tunnel')

// ---------- やってみよう ----------
// 1. lead の ? を増やしたり減らしたりしよう
// 2. pad1 / pad2 の音を変えて、雰囲気を変えよう
