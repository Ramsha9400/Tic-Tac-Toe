const cells = [...document.querySelectorAll('.cell')];
const boardEl = document.getElementById('board');
const turnEl = document.getElementById('turn');
const levelsEl = document.getElementById('levels');
const soundBtn = document.getElementById('sound');
const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const score = { X: 0, O: 0, D: 0 };
let board, player, over, busy = false;
let mode = 'pvp', level = 'hard';          // pvp = two players, cpu = you (X) vs computer (O)

/* ================= SOUND (made with the Web Audio API, no files needed) ================= */
let ctx, muted = false;
function tone(freq, start, dur, { type = 'triangle', vol = 0.25, slide } = {}) {
  if (muted) return;
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  const t = ctx.currentTime + start, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + dur);
}
const sfx = {
  x:       () => { tone(660, 0, .14); tone(140, 0, .1, { type: 'sine', vol: .35 }); },
  o:       () => { tone(495, 0, .14); tone(120, 0, .1, { type: 'sine', vol: .35 }); },
  win:     () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .11, .38, { vol: .22 })),
  draw:    () => { tone(392, 0, .22); tone(330, .18, .32); },
  restart: () => tone(300, 0, .2, { type: 'sine', slide: 900, vol: .2 }),
  mode:    () => { tone(600, 0, .08, { type: 'sine' }); tone(800, .08, .1, { type: 'sine' }); }
};
function toggleSound() {
  muted = !muted;
  soundBtn.setAttribute('aria-pressed', !muted);
  soundBtn.setAttribute('aria-label', muted ? 'Sound off' : 'Sound on');
}

/* ================= COMPUTER PLAYER ================= */
const winner = b => { const l = WINS.find(l => l.every(k => b[k] && b[k] === b[l[0]])); return l ? b[l[0]] : null; };
const empties = b => b.map((v, i) => v ? -1 : i).filter(i => i >= 0);

function minimax(b, turn) {                          // +1 = computer (O) wins, -1 = you win, 0 = draw
  const w = winner(b);
  if (w) return w === 'O' ? 1 : -1;
  const free = empties(b);
  if (!free.length) return 0;
  const scores = free.map(i => { b[i] = turn; const s = minimax(b, turn === 'O' ? 'X' : 'O'); b[i] = ''; return s; });
  return turn === 'O' ? Math.max(...scores) : Math.min(...scores);
}

function pickMove() {
  const free = empties(board);
  const tryFor = who => free.find(i => { board[i] = who; const w = winner(board) === who; board[i] = ''; return w; });
  if (level === 'easy') {                            // easy: takes a win if it sees one, otherwise random
    const win = tryFor('O');
    return win !== undefined ? win : free[Math.floor(Math.random() * free.length)];
  }
  let best = -2, move = free[0];                     // hard: perfect play, it can never lose
  [4, 0, 2, 6, 8, 1, 3, 5, 7].filter(i => !board[i]).forEach(i => {
    board[i] = 'O'; const s = minimax(board, 'X'); board[i] = '';
    if (s > best) { best = s; move = i; }
  });
  return move;
}

/* ================= GAME ================= */
const label = (i, m) => `Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}, ${m || 'empty'}`;

function showTurn() {
  turnEl.className = 'turn';
  turnEl.dataset.p = player;
  turnEl.innerHTML = `<i class="dot"></i>${mode === 'cpu' ? (player === 'X' ? 'Your turn' : 'Computer is thinking...') : player + "'s turn"}`;
}

function renderScore() {
  document.getElementById('sx').textContent = score.X;
  document.getElementById('so').textContent = score.O;
  document.getElementById('sd').textContent = score.D;
  document.getElementById('lx').textContent = mode === 'cpu' ? 'You' : 'X wins';
  document.getElementById('lo').textContent = mode === 'cpu' ? 'Computer' : 'O wins';
}

function start() {                                   // new round (X always starts)
  board = Array(9).fill('');
  player = 'X'; over = false; busy = false;
  boardEl.classList.remove('over');
  cells.forEach((c, i) => { c.textContent = ''; c.className = 'cell'; c.setAttribute('aria-label', label(i)); });
  showTurn();
}

function finish(who, line = []) {
  over = true;
  boardEl.classList.add('over');
  if (who) { score[who]++; line.forEach(k => cells[k].classList.add('win')); } else score.D++;
  renderScore();
  turnEl.className = 'turn end';
  turnEl.dataset.p = who || 'D';
  turnEl.textContent = !who ? "It's a draw" : mode === 'cpu' ? (who === 'X' ? 'You win!' : 'Computer wins!') : `${who} wins!`;
  setTimeout(who ? sfx.win : sfx.draw, 180);
}

function play(i) {
  if (over || busy || board[i]) return;
  board[i] = player;
  cells[i].textContent = player;
  cells[i].classList.add('taken', player.toLowerCase());
  cells[i].setAttribute('aria-label', label(i, player));
  sfx[player.toLowerCase()]();

  const line = WINS.find(l => l.every(k => board[k] === player));
  if (line) return finish(player, line);
  if (board.every(Boolean)) return finish(null);

  player = player === 'X' ? 'O' : 'X';
  showTurn();
  if (mode === 'cpu' && player === 'O') {            // computer answers after a short pause
    busy = true;
    setTimeout(() => { busy = false; play(pickMove()); }, 550);
  }
}

function setMode(m) {
  mode = m;
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  levelsEl.hidden = m !== 'cpu';
  score.X = score.O = score.D = 0;                   // new match-up = fresh score
  renderScore(); start(); sfx.mode();
}

document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
document.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => {
  level = b.dataset.level;
  document.querySelectorAll('[data-level]').forEach(x => x.classList.toggle('on', x === b));
  score.X = score.O = score.D = 0; renderScore(); start(); sfx.mode();
}));
cells.forEach((c, i) => c.addEventListener('click', () => play(i)));
document.getElementById('restart').addEventListener('click', () => { start(); sfx.restart(); });
document.getElementById('reset').addEventListener('click', () => { score.X = score.O = score.D = 0; renderScore(); start(); sfx.restart(); });
soundBtn.addEventListener('click', toggleSound);

addEventListener('keydown', e => {                   // 1-9 = cells, R = restart, M = mute
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (/[1-9]/.test(e.key)) play(+e.key - 1);
  if (e.key.toLowerCase() === 'r') { start(); sfx.restart(); }
  if (e.key.toLowerCase() === 'm') toggleSound();
});

start();
renderScore();
