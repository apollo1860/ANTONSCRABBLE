async function loadLexicon() {
  const info = document.getElementById('lexInfo');
  const hint = document.getElementById('lexHint');
  const startBtn = document.getElementById('startBtn');
  const LEX_URL = new URL('duden.txt', document.baseURI).toString(); // robust relativ zur Seite

  function show(msg){ if(info) info.textContent = msg; if(hint) hint.textContent = msg; }

  try {
    show('Lexikon: lädt…');
    const res = await fetch(LEX_URL + '?ts=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' beim Laden von ' + LEX_URL);
    const txt = await res.text();
    const words = txt.split(/\r?\n/).map(w => w.toUpperCase().replace(/[^A-ZÄÖÜẞ]/g,'')).filter(Boolean);
    const count = words.length;
    window.state.lex = new Set(words);
    show(`Lexikon: ${count.toLocaleString('de-DE')} Wörter`);
    if (startBtn) startBtn.disabled = count === 0;
    console.log('Lexikon geladen:', { url: LEX_URL, count });
  } catch (err) {
    console.error('Lexikon-Fehler:', err);
    show('Lexikon konnte nicht geladen werden (duden.txt). Siehe Konsole.');
    if (startBtn) startBtn.disabled = true;
  }
}

'use strict';

// --- Constants
const SIZE = 15; const CENTER = 7; const GOLDEN_COUNT = 10;
const PREMIUMS = (()=>{ const g=Array.from({length:SIZE},()=>Array(SIZE).fill(null)); const TW=[[0,0],[0,7],[0,14],[7,0],[7,14],[14,0],[14,7],[14,14]]; const DW=[[1,1],[2,2],[3,3],[4,4],[10,10],[11,11],[12,12],[13,13],[1,13],[2,12],[3,11],[4,10],[10,4],[11,3],[12,2],[13,1],[7,7]]; const TL=[[1,5],[1,9],[5,1],[5,5],[5,9],[5,13],[9,1],[9,5],[9,9],[9,13],[13,5],[13,9]]; const DL=[[0,3],[0,11],[2,6],[2,8],[3,0],[3,7],[3,14],[6,2],[6,6],[6,8],[6,12],[7,3],[7,11],[8,2],[8,6],[8,8],[8,12],[11,0],[11,7],[11,14],[12,6],[12,8],[14,3],[14,11]]; TW.forEach(([r,c])=>g[r][c]='TW'); DW.forEach(([r,c])=>g[r][c]='DW'); TL.forEach(([r,c])=>g[r][c]='TL'); DL.forEach(([r,c])=>g[r][c]='DL'); return g; })();
const LETTER_SCORES={'E':1,'N':1,'S':1,'I':1,'R':1,'T':1,'U':1,'A':1,'D':2,'H':2,'G':2,'L':2,'O':2,'M':3,'B':3,'W':3,'Z':3,'C':4,'F':4,'K':4,'P':4,'Ä':6,'Ö':6,'Ü':6,'J':6,'X':8,'Q':10,'Y':10,'?':0};
const BAG_TEMPLATE=[...Array(15).fill('E'),...Array(9).fill('N'),...Array(7).fill('S'),...Array(6).fill('I'),...Array(6).fill('R'),...Array(6).fill('T'),...Array(6).fill('U'),...Array(5).fill('A'),...Array(4).fill('D'),...Array(4).fill('H'),...Array(3).fill('G'),...Array(3).fill('L'),...Array(3).fill('O'),...Array(4).fill('M'),...Array(2).fill('B'),...Array(2).fill('W'),...Array(2).fill('Z'),...Array(2).fill('C'),...Array(2).fill('F'),...Array(2).fill('K'),...Array(1).fill('P'),...Array(1).fill('Ä'),...Array(1).fill('Ö'),...Array(1).fill('Ü'),...Array(1).fill('J'),...Array(1).fill('X'),...Array(1).fill('Q'),...Array(1).fill('Y'),'?','?'].slice(0,102);

// --- DOM
const gridEl=document.getElementById('grid'); const playerRackEl=document.getElementById('playerRack'); const botRackEl=document.getElementById('botRack'); const pScoreEl=document.getElementById('pScore'); const bScoreEl=document.getElementById('bScore'); const statusEl=document.getElementById('status'); const logEl=document.getElementById('log'); const challengeBar=document.getElementById('challengeBar'); const startScreen=document.getElementById('startScreen'); const startBtn=document.getElementById('startBtn'); const strengthButtons=[...document.querySelectorAll('.strength')]; const lexInfo=document.getElementById('lexInfo'); const lexHint=document.getElementById('lexHint');

// --- State
const state={ board:Array.from({length:SIZE},()=>Array(SIZE).fill(null)), bag:[], playerRack:[], botRack:[], scores:{player:0,bot:0}, turn:'player', placedThisTurn:[], difficulty:'normal', firstMove:true, lastBotMove:null, lex:new Set() };

// --- Utils
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a; }
function log(msg){ const p=document.createElement('p'); p.textContent=msg; logEl.appendChild(p); logEl.scrollTop=logEl.scrollHeight; }
function status(msg){ statusEl.textContent=msg; }
function normalize(w){ return (w||'').toUpperCase().replace(/[^A-ZÄÖÜẞ]/g,''); }
function isValidWord(w){ const n=normalize(w); return !!n && state.lex.has(n); }

// --- Game init
async function loadLexicon(){
  try{
    const res = await fetch('duden.txt', { cache:'force-cache' });
    if(!res.ok) throw new Error('HTTP '+res.status);
    const txt = await res.text();
    const words = txt.split(/\r?\n/).map(normalize).filter(Boolean);
    state.lex = new Set(words);
    const msg = `Lexikon: ${state.lex.size.toLocaleString('de-DE')} Wörter`;
    if(lexInfo) lexInfo.textContent = msg;
    if(lexHint) lexHint.textContent = msg;
    if(startBtn) startBtn.disabled = state.lex.size===0;
  } catch(err){
    const msg = 'Lexikon konnte nicht geladen werden (duden.txt).';
    if(lexInfo) lexInfo.textContent = msg;
    if(lexHint) lexHint.textContent = msg + ' Prüfe Pfad/Hosting.';
    if(startBtn) startBtn.disabled = true;
    console.error(err);
  }
}
loadLexicon();

function newGame(){
  state.board=Array.from({length:SIZE},()=>Array(SIZE).fill(null));
  state.bag=shuffle([...BAG_TEMPLATE]);
  const goldenIdx=new Set(); while(goldenIdx.size<Math.min(GOLDEN_COUNT,state.bag.length)) goldenIdx.add(Math.floor(Math.random()*state.bag.length));
  state.bag=state.bag.map((ch,idx)=>({ch,golden:goldenIdx.has(idx)}));
  state.playerRack=drawTiles(7); state.botRack=drawTiles(7);
  state.scores={player:0,bot:0}; state.turn='player'; state.placedThisTurn=[]; state.firstMove=true; state.lastBotMove=null;
  gridEl.innerHTML=''; logEl.innerHTML='';
  renderBoard(); renderRacks(); updateScores(); challengeBar.style.display='none';
  log('Neues Spiel gestartet. Lege als erster über das mittige Feld.');
  status('Start: Muss das Zentrum (⭐) berühren.');
}
function drawTiles(n){ const tiles=[]; for(let i=0;i<n&&state.bag.length;i++) tiles.push(state.bag.pop()); return tiles; }

// --- Rendering
function renderBoard(){ gridEl.innerHTML=''; for(let r=0;r<SIZE;r++){ for(let c=0;c<SIZE;c++){ const cell=document.createElement('div'); const premium=PREMIUMS[r][c]; cell.className='cell'+(premium? ' premium '+premium:'')+((r===CENTER&&c===CENTER)?' center':''); cell.dataset.r=r; cell.dataset.c=c; const payload=state.board[r][c]; if(payload){ cell.appendChild(renderTile(payload)); } const s=document.createElement('div'); s.className='small'; s.textContent=(r===CENTER&&c===CENTER)?'⭐':(premium||''); cell.appendChild(s); cell.addEventListener('dragover',onDragOverCell); cell.addEventListener('drop',onDropOnCell); gridEl.appendChild(cell); } } }
function renderTile({ch,golden}){ const t=document.createElement('div'); t.className='tile'+(golden?' golden':''); t.draggable=true; t.textContent=ch; const s=document.createElement('span'); s.className='score'; s.textContent=LETTER_SCORES[ch]??0; t.appendChild(s); t.addEventListener('dragstart',onDragStartTile); t.addEventListener('dragend',()=>document.querySelectorAll('.drop-ok').forEach(el=>el.classList.remove('drop-ok'))); return t; }
function renderRacks(){ playerRackEl.innerHTML=''; botRackEl.innerHTML=''; state.playerRack.forEach((tile,idx)=>{ const el=renderTile(tile); el.dataset.from='player'; el.dataset.idx=idx; playerRackEl.appendChild(el); }); state.botRack.forEach(()=>{ const cov=document.createElement('div'); cov.className='tile'; cov.textContent='?'; botRackEl.appendChild(cov); }); }

// --- DnD
let dragData=null; function onDragStartTile(e){ const fromRack=e.target.dataset.from||null; const idx=e.target.dataset.idx?parseInt(e.target.dataset.idx,10):null; dragData={fromRack,idx,payload: fromRack==='player'? state.playerRack[idx]:null}; document.querySelectorAll('.cell').forEach(c=>c.classList.add('drop-ok')); }
function onDragOverCell(e){ e.preventDefault(); }
function onDropOnCell(e){ e.preventDefault(); document.querySelectorAll('.drop-ok').forEach(el=>el.classList.remove('drop-ok')); const r=parseInt(e.currentTarget.dataset.r,10), c=parseInt(e.currentTarget.dataset.c,10); if(!dragData||!dragData.payload) return; if(state.board[r][c]){ status('Feld belegt.'); return; } if(state.turn!=='player'){ status('Der Bot ist am Zug.'); return; } const tile=dragData.payload; state.board[r][c]=tile; state.placedThisTurn.push({r,c,...tile,fromRack:dragData.fromRack}); if(dragData.fromRack==='player') state.playerRack.splice(dragData.idx,1); renderBoard(); renderRacks(); }

// --- Rules
function sameLine(placed){ const rows=new Set(placed.map(p=>p.r)); const cols=new Set(placed.map(p=>p.c)); return rows.size===1||cols.size===1; }
function contiguousMainLine(placed){ if(placed.length<=1) return true; if(!sameLine(placed)) return false; const sort=[...placed].sort((a,b)=> a.r===b.r? a.c-b.c : a.r-b.r); if(sort[0].r===sort.at(-1).r){ const r=sort[0].r; for(let x=sort[0].c;x<=sort.at(-1).c;x++){ if(!state.board[r][x]) return false; } return true; } else { const c=sort[0].c; for(let y=sort[0].r;y<=sort.at(-1).r;y++){ if(!state.board[y][c]) return false; } return true; } }
function touchesExisting(placed){ if(state.firstMove){ return placed.some(p=> p.r===CENTER && p.c===CENTER); } const dirs=[[1,0],[-1,0],[0,1],[0,-1]]; for(const p of placed){ for(const [dr,dc] of dirs){ const rr=p.r+dr, cc=p.c+dc; if(rr>=0&&cc>=0&&rr<SIZE&&cc<SIZE && state.board[rr][cc] && !placed.some(k=>k.r===rr&&k.c===cc)) return true; } } return false; }
function getLineString(r,c,dr,dc){ let y=r,x=c; while(y-dr>=0&&y-dr<SIZE&&x-dc>=0&&x-dc<SIZE && state.board[y-dr][x-dc]){ y-=dr; x-=dc; } let word=''; const coords=[]; while(y>=0&&y<SIZE&&x>=0&&x<SIZE && state.board[y][x]){ word+=state.board[y][x].ch; coords.push([y,x]); y+=dr; x+=dc; } return {word,coords}; }
function getWordsFormed(placed){ const words=[]; if(!placed.length) return words; const lineHorizontal = placed.every(p=>p.r===placed[0].r); const lineVertical = placed.every(p=>p.c===placed[0].c); if(!(lineHorizontal||lineVertical)) return []; const sample = placed[0]; const main = lineHorizontal ? getLineString(sample.r, sample.c, 0, 1) : getLineString(sample.r, sample.c, 1, 0); if(main.word.length>1) words.push({ word: main.word, coords: main.coords }); for(const p of placed){ const cross = lineHorizontal ? getLineString(p.r, p.c, 1, 0) : getLineString(p.r, p.c, 0, 1); if(cross.word.length>1) words.push({ word: cross.word, coords: cross.coords }); } const seen=new Set(); return words.filter(w=>{ const key=w.word+':'+w.coords.map(c=>c.join(',')).join(';'); if(seen.has(key)) return false; seen.add(key); return true; }); }
function scoreWord(entry, placedSet){ let sum=0, wordMult=1; for(const [r,c] of entry.coords){ const tile=state.board[r][c]; const ch=tile.ch; let letter=LETTER_SCORES[ch]??0; if(tile.golden) letter*=2; const isNew=placedSet.has(r+','+c); const prem = isNew? PREMIUMS[r][c] : null; if(prem==='DL') sum += letter*2; else if(prem==='TL') sum += letter*3; else sum += letter; if(prem==='DW') wordMult*=2; if(prem==='TW') wordMult*=3; } return sum*wordMult; }
function scorePlacement(placed){ const placedSet=new Set(placed.map(p=>p.r+','+p.c)); const words=getWordsFormed(placed); let total=0; for(const w of words){ total+=scoreWord(w, placedSet); } const cat=document.getElementById('category').value; if(state.turn==='player' && cat!=='none' && words.length>0) total*=2; return { total, words }; }
function allWordsValid(words){ return words.length>0 && words.every(w=> isValidWord(w.word)); }

function updateScores(){ pScoreEl.textContent=state.scores.player; bScoreEl.textContent=state.scores.bot; }
function refillRack(who){ const rack=who==='player'?state.playerRack:state.botRack; while(rack.length<7 && state.bag.length) rack.push(state.bag.pop()); }
function commitPlacement(placed, points){ if(state.turn==='player'){ state.scores.player+=points; refillRack('player'); } else { state.scores.bot+=points; refillRack('bot'); } state.placedThisTurn=[]; state.firstMove=false; updateScores(); renderBoard(); renderRacks(); }

// --- Player controls
document.getElementById('confirmMove').addEventListener('click',()=>{ if(state.turn!=='player'){ status('Nicht dein Zug.'); return; } const placed=state.placedThisTurn; if(!placed.length){ status('Lege zuerst Steine.'); return; } if(!sameLine(placed) || !contiguousMainLine(placed)){ status('Regel: In einer Zeile/Spalte lückenlos anschließen.'); return; } if(!touchesExisting(placed)){ status(state.firstMove? 'Erster Zug muss das Zentrum berühren.' : 'Muss an bestehende Wörter anschließen.'); return; } const { total, words } = scorePlacement(placed); if(!allWordsValid(words)){ status('Ungültige Wörter (Duden-Liste).'); return; } commitPlacement(placed, total); log(`Spieler legt ${words.map(w=>w.word).join(' + ')} für ${total} Punkte.`); state.turn='bot'; status('Bot denkt…'); challengeBar.style.display='none'; setTimeout(botTurn, 250); });

document.getElementById('shuffleRack').addEventListener('click',()=>{ shuffle(state.playerRack); renderRacks(); });
document.getElementById('swapTiles').addEventListener('click',()=>{ const n=Math.min(3,state.playerRack.length); for(let i=0;i<n;i++){ const idx=Math.floor(Math.random()*state.playerRack.length); state.bag.unshift(state.playerRack.splice(idx,1)[0]); } shuffle(state.bag); state.playerRack.push(...drawTiles(n)); renderRacks(); });

// --- Bot
function botTurn(){ const target=({amateur:10,normal:15,profi:20})[state.difficulty]||15; const rack=state.botRack; const maxTries=600; let best=null; function tryPlaceCandidate(){ const horizontal=Math.random()<0.5; const len=Math.max(2, Math.min(7, 2+Math.floor(Math.random()*6))); const r=Math.floor(Math.random()*SIZE), c=Math.floor(Math.random()*SIZE); const cells=[]; for(let i=0;i<len;i++){ const rr=r+(horizontal?0:i), cc=c+(horizontal?i:0); if(rr>=SIZE||cc>=SIZE) return null; if(state.board[rr][cc]) return null; cells.push([rr,cc]); } const placed = cells.map(([rr,cc],i)=>({r:rr,c:cc,...rack[i%rack.length]})); if(state.firstMove && !placed.some(p=>p.r===CENTER&&p.c===CENTER)) return null; if(!state.firstMove){ const touches = placed.some(p=> [[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc])=>{ const rr=p.r+dr,cc=p.c+dc; return rr>=0&&cc>=0&&rr<SIZE&&cc<SIZE && state.board[rr][cc]; })); if(!touches) return null; } const perm=shuffle(rack.slice()); const pick=perm.slice(0,len); const placedReal=pick.map((t,i)=>({r:cells[i][0],c:cells[i][1],ch:t.ch,golden:t.golden,idx:rack.indexOf(t)})); for(const p of placedReal){ state.board[p.r][p.c]={ch:p.ch,golden:p.golden}; } const words=getWordsFormed(placedReal); let valid=false, points=0; if(words.length){ valid = words.every(w=> isValidWord(w.word)); if(valid){ const res=scorePlacement(placedReal); points=res.total; } } for(const p of placedReal){ state.board[p.r][p.c]=null; } if(!valid) return null; const distance=Math.abs(points-target); return { placed:placedReal, pts:points, distance, words };
  } for(let t=0;t<maxTries;t++){ const cand=tryPlaceCandidate(); if(!cand) continue; if(!best || cand.distance<best.distance) best=cand; if(best && best.distance<=2) break; } if(!best){ log('Bot passt.'); status('Bot passt.'); state.turn='player'; challengeBar.style.display='none'; return; } for(const p of best.placed){ state.board[p.r][p.c]={ch:p.ch,golden:p.golden}; } const idxs=[...new Set(best.placed.map(p=>p.idx))].sort((a,b)=>b-a); for(const i of idxs){ if(i>-1) rack.splice(i,1); } const words=getWordsFormed(best.placed); commitPlacement(best.placed, best.pts); state.lastBotMove = { placed: best.placed, pts: best.pts, words: words.map(w=>w.word) }; log(`Bot legt ${state.lastBotMove.words.join(' + ')} für ${best.pts} Punkte.`); challengeBar.style.display='flex'; status('Bot ist fertig – du kannst den Zug prüfen/ablehnen.'); }

// Challenge
 document.getElementById('acceptBot').addEventListener('click',()=>{ challengeBar.style.display='none'; state.turn='player'; status('Du bist dran.'); });
 document.getElementById('rejectBot').addEventListener('click',()=>{ if(!state.lastBotMove){ challengeBar.style.display='none'; return; } for(const p of state.lastBotMove.placed){ if(state.board[p.r][p.c]){ state.board[p.r][p.c]=null; state.botRack.push({ch:p.ch,golden:p.golden}); } } state.scores.bot -= state.lastBotMove.pts; updateScores(); renderBoard(); renderRacks(); log('Du hast den Bot-Zug abgelehnt. Bot versucht erneut.'); challengeBar.style.display='none'; state.lastBotMove=null; (function retryBot(){ const target=({amateur:10,normal:15,profi:20})[state.difficulty]||15; let attempt=0, best=null; const maxAttempts=400; function tryCandidate(){ const horizontal=Math.random()<0.5; const len=Math.max(2, Math.min(7, 2+Math.floor(Math.random()*6))); const r=Math.floor(Math.random()*SIZE), c=Math.floor(Math.random()*SIZE); const cells=[]; for(let i=0;i<len;i++){ const rr=r+(horizontal?0:i), cc=c+(horizontal?i:0); if(rr>=SIZE||cc>=SIZE) return null; if(state.board[rr][cc]) return null; cells.push([rr,cc]); } const perm=shuffle(state.botRack.slice()); const pick=perm.slice(0,len); const placed=pick.map((t,i)=>({r:cells[i][0],c:cells[i][1],ch:t.ch,golden:t.golden,idx: state.botRack.indexOf(t)})); if(state.firstMove && !placed.some(p=>p.r===CENTER&&p.c===CENTER)) return null; if(!state.firstMove){ const touches = placed.some(p=> [[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc])=>{ const rr=p.r+dr,cc=p.c+dc; return rr>=0&&cc>=0&&rr<SIZE&&cc<SIZE && state.board[rr][cc]; })); if(!touches) return null; } for(const p of placed){ state.board[p.r][p.c]={ch:p.ch,golden:p.golden}; } const words=getWordsFormed(placed); let ok=false, pts=0; if(words.length && words.every(w=> isValidWord(w.word))){ const res=scorePlacement(placed); pts=res.total; ok=true; } for(const p of placed){ state.board[p.r][p.c]=null; } if(!ok) return null; const distance=Math.abs(pts-target); return {placed,pts,distance,words}; } for(;attempt<maxAttempts;attempt++){ const cand=tryCandidate(); if(!cand) continue; if(!best||cand.distance<best.distance) best=cand; if(best.distance<=2) break; } if(!best){ log('Bot findet kein alternatives Wort und passt.'); status('Bot passt.'); state.turn='player'; return; } for(const p of best.placed){ state.board[p.r][p.c]={ch:p.ch,golden:p.golden}; } const idxs=[...new Set(best.placed.map(p=>p.idx))].sort((a,b)=>b-a); for(const i of idxs){ if(i>-1) state.botRack.splice(i,1); } commitPlacement(best.placed, best.pts); state.lastBotMove={ placed:best.placed, pts:best.pts, words: best.words.map(w=>w.word) }; log(`Bot legt neu: ${state.lastBotMove.words.join(' + ')} für ${best.pts} Punkte.`); challengeBar.style.display='flex'; status('Bot hat neu gelegt – prüfen/ablehnen möglich.'); })(); });

// --- Header controls
 document.getElementById('newGameBtn').addEventListener('click', ()=>{ startScreen.style.display='flex'; });
 document.getElementById('difficulty').addEventListener('change',e=>{ state.difficulty=e.target.value; status(`Schwierigkeit: ${e.target.options[e.target.selectedIndex].text}`); });

// --- Start screen
let chosenDiff='normal';
strengthButtons.forEach(btn=>{ btn.addEventListener('click',()=>{ strengthButtons.forEach(b=> b.classList.remove('active')); btn.classList.add('active'); chosenDiff=btn.dataset.diff; }); });
startBtn.addEventListener('click',()=>{ state.difficulty=chosenDiff; const diffSel=document.getElementById('difficulty'); if(diffSel){ diffSel.value=chosenDiff; } startScreen.style.display='none'; newGame(); });
