// Canvas 2D Renderer for Pirate Sea Battle
export type Screen = 'LOADING' | 'MAIN_MENU' | 'BOT_SETUP' | 'BATTLE' | 'BATTLE_1V1' | 'SETTINGS' | 'GAME_OVER';
export type CellState = 'EMPTY' | 'SHIP' | 'HIT' | 'MISS' | 'SUNK';
export interface Position { x: number; y: number; }
export interface Cell { state: CellState; }
export interface ShipStatus { size: number; alive: boolean; }
export interface FleetStatus { ships: ShipStatus[]; }
export interface BattleState { playerGrid: Cell[][]; enemyGrid: Cell[][]; playerFleet: FleetStatus; enemyFleet: FleetStatus; cursor: Position | null; messages: string[]; playerTurn: boolean; }
export interface Battle1V1State { player1Grid: Cell[][]; player2Grid: Cell[][]; player1Fleet: FleetStatus; player2Fleet: FleetStatus; cursor: Position | null; messages: string[]; player1Turn: boolean; timerProgress: number; }

export interface GameState {
  screen: Screen;
  selectedIndex?: number;
  difficulty?: 'easy' | 'hard';
  placement?: 'auto' | 'manual';
  selectedRow?: number;
  battleState?: BattleState;
  battle1v1State?: Battle1V1State;
  isVictory?: boolean;
}

const C = {
  bg: '#0a0a0f', water: '#00ffff', playerShip: '#00ff41', hit: '#ff0040',
  miss: '#555555', cursor: '#ffff00', sunk: '#ff6600', gold: '#ffd700',
  text: '#e0e0e0', gridLine: 'rgba(0,255,65,0.25)', scanline: 'rgba(0,255,65,0.03)',
};
const CS = 32; const CG = 2; const GS = 10; const TGW = GS * (CS + CG) - CG;
const LABELS = ['А','Б','В','Г','Д','Е','Ж','З','И','К'];
const SHIP_NAMES: Record<number, string> = { 4: 'Линкор', 3: 'Крейсер', 2: 'Эсминец', 1: 'Торпедный катер' };

function gridToPixel(gx: number, gy: number, ox: number, oy: number): { px: number; py: number } { return { px: ox + gx * (CS + CG), py: oy + gy * (CS + CG) }; }

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private blinkOn = false;
  private blinkTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize(): void {
    const canvas = this.ctx.canvas;
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    canvas.width = this.width * this.dpr;
    canvas.height = this.height * this.dpr;
    canvas.style.width = this.width + 'px';
    canvas.style.height = this.height + 'px';
    this.ctx.scale(this.dpr, this.dpr);
  }

  render(state: GameState, time: number): void {
    this.blinkTimer += 16;
    if (this.blinkTimer > 500) { this.blinkTimer = 0; this.blinkOn = !this.blinkOn; }
    const ctx = this.ctx;
    const w = this.width; const h = this.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);

    switch (state.screen) {
      case 'LOADING': this.drawLoading(w, h, time); break;
      case 'MAIN_MENU': this.drawMainMenu(w, h, state.selectedIndex || 0); break;
      case 'BOT_SETUP': this.drawBotSetup(w, h, state.difficulty || 'hard', state.placement || 'manual', state.selectedRow || 0); break;
      case 'BATTLE': if (state.battleState) this.drawBattle(w, h, state.battleState, time); break;
      case 'BATTLE_1V1': if (state.battle1v1State) this.drawBattle1V1(w, h, state.battle1v1State, time); break;
      case 'SETTINGS': this.drawSettings(w, h); break;
      case 'GAME_OVER': this.drawGameOver(w, h, state.isVictory || false, time); break;
    }

    this.drawCRT(w, h, time);
  }

  private drawLoading(w: number, h: number, time: number): void {
    const progress = Math.min(1, (time - 0) / 2500);
    this.drawText('⚓ ЗАГРУЗКА...', w / 2, h * 0.4, { font: "24px 'Press Start 2P'", color: C.gold, align: 'center', glow: 10 });
    // Progress bar
    const bw = Math.min(400, w * 0.5); const bh = 8;
    this.ctx.fillStyle = 'rgba(255,215,0,0.2)'; this.ctx.fillRect((w - bw) / 2, h * 0.55, bw, bh);
    this.ctx.fillStyle = C.gold; this.ctx.fillRect((w - bw) / 2, h * 0.55, bw * progress, bh);
    // Dots
    const dots = Math.floor(time / 300) % 4;
    this.drawText('.'.repeat(dots), w / 2, h * 0.6, { font: "20px 'VT323'", color: C.water, align: 'center' });
  }

  private drawMainMenu(w: number, h: number, selected: number): void {
    // Title
    this.drawText('⚓ ПИРАТСКИЙ', w / 2, h * 0.15, { font: "28px 'Press Start 2P'", color: C.playerShip, align: 'center', glow: 12 });
    this.drawText('МОРСКОЙ БОЙ', w / 2, h * 0.25, { font: "28px 'Press Start 2P'", color: C.playerShip, align: 'center', glow: 12 });
    this.drawText('~ ~ ~ ◆ ~ ~ ~', w / 2, h * 0.33, { font: "18px 'VT323'", color: 'rgba(0,255,200,0.3)', align: 'center' });

    const items = ['⚔  БОЙ С БОТОМ', '👥  1 НА 1', '⚙  НАСТРОЙКИ', '🚪  ВЫХОД'];
    const startY = h * 0.45; const gap = 55;
    for (let i = 0; i < items.length; i++) {
      const isSel = i === selected; const y = startY + i * gap;
      if (isSel) {
        this.ctx.fillStyle = 'rgba(255,215,0,0.12)';
        this.ctx.fillRect(w * 0.2, y - 18, w * 0.6, 45);
        this.ctx.strokeStyle = C.gold; this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(w * 0.2, y - 18, w * 0.6, 45);
      }
      this.drawText(items[i], w / 2, y, { font: isSel ? "18px 'Press Start 2P'" : "16px 'Press Start 2P'", color: isSel ? C.gold : '#666', align: 'center', glow: isSel ? 8 : 0 });
      if (isSel && this.blinkOn) this.drawText('►', w * 0.22, y + 4, { font: "16px 'VT323'", color: C.cursor, align: 'left' });
    }
    this.drawText('↑↓ — выбор    Enter — подтвердить', w / 2, h - 40, { font: "14px 'VT323'", color: '#555', align: 'center' });
  }

  private drawBotSetup(w: number, h: number, difficulty: string, placement: string, selectedRow: number): void {
    this.drawText('НАСТРОЙКА БОЯ', w / 2, h * 0.15, { font: "22px 'Press Start 2P'", color: C.gold, align: 'center', glow: 10 });
    this.drawText('━━━━━━━━━━━━━━', w / 2, h * 0.22, { font: "18px 'VT323'", color: C.gridLine, align: 'center' });

    const rows = [
      { label: 'СЛОЖНОСТЬ:', value: difficulty === 'easy' ? 'ЛЁГКИЙ' : 'СЛОЖНЫЙ', y: h * 0.38 },
      { label: 'РАССТАНОВКА:', value: placement === 'auto' ? 'АВТО' : 'ВРУЧНУЮ', y: h * 0.52 },
      { label: '', value: '▶ НАЧАТЬ БОЙ', y: h * 0.70 },
    ];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]; const isSel = i === selectedRow;
      if (isSel && i < 2) { this.ctx.fillStyle = 'rgba(255,215,0,0.1)'; this.ctx.fillRect(w * 0.15, row.y - 15, w * 0.7, 40); }
      if (row.label) this.drawText(row.label, w * 0.25, row.y, { font: "16px 'VT323'", color: isSel ? C.text : '#777', align: 'left' });
      const valColor = i === 2 ? (isSel ? '#00ff41' : '#444') : (isSel ? C.gold : '#999');
      this.drawText(row.value, i === 2 ? w / 2 : w * 0.65, row.y, { font: i === 2 ? "20px 'Press Start 2P'" : "18px 'VT323'", color: valColor, align: i === 2 ? 'center' : 'left', glow: isSel ? 6 : 0 });
      if (isSel && i < 2 && this.blinkOn) { this.drawText('◄', w * 0.55, row.y, { font: "14px 'VT323'", color: C.cursor, align: 'left' }); this.drawText('►', w * 0.85, row.y, { font: "14px 'VT323'", color: C.cursor, align: 'left' }); }
    }
    this.drawText('↑↓ — выбор строки    ←→ — изменить    Enter — старт', w / 2, h - 40, { font: "13px 'VT323'", color: '#555', align: 'center' });
  }

  private drawBattle(w: number, h: number, bs: BattleState, time: number): void {
    // Title
    const turnText = bs.playerTurn ? '⚔ ВАШ ХОД ⚔' : '☠ ХОД БОТА ☠';
    this.drawText(turnText, w / 2, 28, { font: "bold 16px 'VT323'", color: bs.playerTurn ? C.playerShip : C.hit, align: 'center', glow: 6 });

    const fpw = 130; const lpx = 12; const pox = lpx + fpw + 12;
    const g = Math.max(30, Math.floor((w - pox - TGW * 2 - fpw - 12) / 3));
    const eox = pox + TGW + g; const rpx = eox + TGW + 10;
    const oy = Math.max(55, Math.floor((h - TGW) / 2) - 10);

    // Grid titles
    this.drawText('НАШ ФЛОТ', pox + TGW / 2, oy - 28, { font: "bold 13px 'VT323'", color: C.playerShip, align: 'center', glow: 4 });
    this.drawText('ВРАЖЕСКИЙ ФЛОТ', eox + TGW / 2, oy - 28, { font: "bold 13px 'VT323'", color: C.hit, align: 'center', glow: 4 });

    this.drawGridLabels(pox, oy); this.drawGridLabels(eox, oy);
    this.drawGrid(bs.playerGrid, pox, oy, null, true, time);
    this.drawGrid(bs.enemyGrid, eox, oy, bs.cursor, false, time);

    this.drawText('VS', w / 2, oy + TGW / 2, { font: "bold 16px 'Press Start 2P'", color: 'rgba(255,255,255,0.06)', align: 'center' });

    this.drawFleetPanel(lpx, oy, fpw, bs.playerFleet, false, time);
    this.drawFleetPanel(rpx, oy, fpw, bs.enemyFleet, true, time);
    this.drawMessages(bs.messages, h);
  }

  private drawBattle1V1(w: number, h: number, bs: Battle1V1State, time: number): void {
    const turnText = bs.player1Turn ? '⚔ ХОД ИГРОКА 1 ⚔' : '⚔ ХОД ИГРОКА 2 ⚔';
    this.drawText(turnText, w / 2, 28, { font: "bold 16px 'VT323'", color: C.playerShip, align: 'center', glow: 6 });

    // Timer bar
    const tbw = 200; const tbh = 6;
    this.ctx.fillStyle = 'rgba(50,50,60,0.6)'; this.ctx.fillRect((w - tbw) / 2, 38, tbw, tbh);
    this.ctx.fillStyle = `rgba(0,255,65,${0.3 + bs.timerProgress * 0.5})`; this.ctx.fillRect((w - tbw) / 2, 38, tbw * bs.timerProgress, tbh);

    const fpw = 130; const lpx = 12; const pox = lpx + fpw + 12;
    const g = Math.max(30, Math.floor((w - pox - TGW * 2 - fpw - 12) / 3));
    const eox = pox + TGW + g; const rpx = eox + TGW + 10;
    const oy = Math.max(55, Math.floor((h - TGW) / 2) - 5);

    this.drawText('ИГРОК 1', pox + TGW / 2, oy - 28, { font: "bold 13px 'VT323'", color: C.playerShip, align: 'center', glow: 4 });
    this.drawText('ИГРОК 2', eox + TGW / 2, oy - 28, { font: "bold 13px 'VT323'", color: C.water, align: 'center', glow: 4 });

    this.drawGridLabels(pox, oy); this.drawGridLabels(eox, oy);
    this.drawGrid(bs.player1Grid, pox, oy, bs.player1Turn ? bs.cursor : null, true, time);
    this.drawGrid(bs.player2Grid, eox, oy, !bs.player1Turn ? bs.cursor : null, true, time);

    this.drawFleetPanel(lpx, oy, fpw, bs.player1Fleet, false, time);
    this.drawFleetPanel(rpx, oy, fpw, bs.player2Fleet, true, time);
    this.drawMessages(bs.messages, h);
  }

  private drawSettings(w: number, h: number): void {
    this.drawText('⚓ ПИРАТСКИЙ МОРСКОЙ БОЙ ⚓', w / 2, h * 0.1, { font: "20px 'Press Start 2P'", color: C.gold, align: 'center', glow: 10 });

    const lines = [
      '', 'УПРАВЛЕНИЕ:', '',
      '↑ ↓ ← → — перемещение',
      'Пробел — поворот корабля',
      'Enter — подтвердить / выстрел',
      'R — авто-расстановка кораблей',
      '', 'ПРАВИЛА:', '',
      'Расставь корабли на поле 10×10',
      'Потопи весь вражеский флот',
      '10 кораблей: 1×4, 2×3, 3×2, 4×1',
      'Корабли не могут касаться углами',
      'Попадание — право на ещё один ход',
      '', '[Назад — Escape или Enter]',
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]; const isHeader = line === 'УПРАВЛЕНИЕ:' || line === 'ПРАВИЛА:';
      this.drawText(line, w / 2, h * 0.18 + i * 24, { font: isHeader ? "bold 18px 'VT323'" : "16px 'VT323'", color: isHeader ? C.gold : '#aaa', align: 'center' });
    }
  }

  private drawGameOver(w: number, h: number, victory: boolean, time: number): void {
    const glow = 10 + Math.sin(time * 0.003) * 6;
    if (victory) {
      this.drawText('⚓ ПОБЕДА! ⚓', w / 2, h * 0.35, { font: "32px 'Press Start 2P'", color: C.playerShip, align: 'center', glow });
      this.drawText('Вражеский флот уничтожен!', w / 2, h * 0.5, { font: "18px 'VT323'", color: C.gold, align: 'center' });
      this.drawText('♛', w / 2, h * 0.65, { font: "60px monospace", color: C.gold, align: 'center', glow: 15 });
    } else {
      this.drawText('☠ ПОРАЖЕНИЕ ☠', w / 2, h * 0.35, { font: "28px 'Press Start 2P'", color: C.hit, align: 'center', glow });
      this.drawText('Ваш флот потоплен...', w / 2, h * 0.5, { font: "18px 'VT323'", color: C.text, align: 'center' });
      this.drawText('☠', w / 2, h * 0.65, { font: "60px monospace", color: C.sunk, align: 'center', glow: 15 });
    }
    if (this.blinkOn) this.drawText('> НАЖМИТЕ ENTER <', w / 2, h * 0.85, { font: "16px 'VT323'", color: C.cursor, align: 'center', glow: 8 });
  }

  // ---- Grid rendering ----
  private drawGrid(grid: Cell[][], ox: number, oy: number, cursor: Position | null, showShips: boolean, time: number): void {
    for (let y = 0; y < GS; y++) for (let x = 0; x < GS; x++) {
      const { px, py } = gridToPixel(x, y, ox, oy);
      this.drawCell(px, py, grid[y][x].state, showShips, time);
      if (cursor && cursor.x === x && cursor.y === y && this.blinkOn) this.drawCursor(px, py);
    }
  }

  private drawCell(px: number, py: number, state: CellState, showShips: boolean, time: number): void {
    const ctx = this.ctx; const cx = px + CS / 2; const cy = py + CS / 2;
    ctx.fillStyle = 'rgba(0,15,25,0.7)'; ctx.fillRect(px, py, CS, CS);
    ctx.strokeStyle = C.gridLine; ctx.lineWidth = 0.5; ctx.strokeRect(px, py, CS, CS);

    switch (state) {
      case 'EMPTY': { const p = 0.4 + Math.sin(time * 0.0025 + px * 0.15 + py * 0.12) * 0.25; ctx.fillStyle = `rgba(0,200,255,${p * 0.18})`; ctx.font = `${CS * 0.55}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('~', cx, cy); break; }
      case 'SHIP': if (showShips) { ctx.fillStyle = 'rgba(0,255,65,0.22)'; ctx.fillRect(px + 1, py + 1, CS - 2, CS - 2); ctx.fillStyle = C.playerShip; ctx.font = `${CS * 0.55}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = C.playerShip; ctx.shadowBlur = 8; ctx.fillText('■', cx, cy); ctx.shadowBlur = 0; } else { const p = 0.4 + Math.sin(time * 0.0025 + px * 0.15) * 0.25; ctx.fillStyle = `rgba(0,200,255,${p * 0.18})`; ctx.font = `${CS * 0.55}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('~', cx, cy); } break;
      case 'HIT': { ctx.fillStyle = 'rgba(255,0,64,0.18)'; ctx.fillRect(px + 1, py + 1, CS - 2, CS - 2); ctx.fillStyle = C.hit; ctx.font = `bold ${CS * 0.6}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = C.hit; ctx.shadowBlur = 10; ctx.fillText('✖', cx, cy); ctx.shadowBlur = 0; break; }
      case 'MISS': ctx.fillStyle = C.miss; ctx.beginPath(); ctx.arc(cx, cy, CS * 0.1, 0, Math.PI * 2); ctx.fill(); break;
      case 'SUNK': { ctx.fillStyle = 'rgba(255,102,0,0.3)'; ctx.fillRect(px + 1, py + 1, CS - 2, CS - 2); ctx.fillStyle = C.sunk; ctx.font = `${CS * 0.55}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = C.sunk; ctx.shadowBlur = 8; ctx.fillText('#', cx, cy); ctx.shadowBlur = 0; break; }
    }
  }

  private drawCursor(px: number, py: number): void {
    this.ctx.strokeStyle = C.cursor; this.ctx.lineWidth = 2; this.ctx.shadowColor = C.cursor; this.ctx.shadowBlur = 12;
    this.ctx.strokeRect(px + 1, py + 1, CS - 2, CS - 2);
    this.ctx.fillStyle = C.cursor; this.ctx.font = `bold ${CS * 0.45}px monospace`; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle'; this.ctx.fillText('+', px + CS / 2, py + CS / 2); this.ctx.shadowBlur = 0;
  }

  private drawGridLabels(ox: number, oy: number): void {
    const ctx = this.ctx; ctx.fillStyle = C.playerShip; ctx.font = `bold 12px 'VT323'`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = C.playerShip; ctx.shadowBlur = 4;
    for (let i = 0; i < GS; i++) { const { px } = gridToPixel(i, 0, ox, oy); ctx.fillText(LABELS[i], px + CS / 2, oy - 14); }
    for (let i = 0; i < GS; i++) { const { py } = gridToPixel(0, i, ox, oy); ctx.fillText(String(i + 1), ox - 16, py + CS / 2); }
    ctx.shadowBlur = 0;
  }

  private drawFleetPanel(x: number, y: number, w: number, fleet: FleetStatus, isEnemy: boolean, time: number): void {
    const lh = 18; const ctx = this.ctx;
    ctx.fillStyle = 'rgba(10,15,20,0.85)'; ctx.fillRect(x, y, w, fleet.ships.length * lh + 30);
    ctx.strokeStyle = C.gridLine; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, fleet.ships.length * lh + 30);
    ctx.font = `bold 12px 'VT323'`; ctx.fillStyle = isEnemy ? C.hit : C.playerShip; ctx.textAlign = 'left'; ctx.shadowColor = isEnemy ? C.hit : C.playerShip; ctx.shadowBlur = 4;
    ctx.fillText(isEnemy ? '\u2620 ВРАЖЕСКИЙ ФЛОТ' : '\u2693 НАШ ФЛОТ', x + 8, y + 16); ctx.shadowBlur = 0;
    for (let i = 0; i < fleet.ships.length; i++) {
      const s = fleet.ships[i]; const sy = y + 28 + i * lh;
      ctx.font = `11px 'VT323'`; ctx.fillStyle = s.alive ? C.text : '#555'; ctx.fillText(SHIP_NAMES[s.size] || 'Корабль', x + 8, sy);
      ctx.fillStyle = 'rgba(50,50,60,0.6)'; ctx.fillRect(x + 80, sy - 6, w - 96, 8);
      if (!s.alive) { ctx.fillStyle = 'rgba(255,0,40,0.6)'; ctx.fillRect(x + 80, sy - 6, w - 96, 8); }
      else { const p = 0.8 + Math.sin(time * 0.003 + i) * 0.2; ctx.fillStyle = isEnemy ? `rgba(255,0,64,${p * 0.6})` : `rgba(0,255,65,${p * 0.6})`; ctx.fillRect(x + 80, sy - 6, w - 96, 8); }
      ctx.font = `10px 'VT323'`; ctx.textAlign = 'right'; ctx.fillStyle = s.alive ? C.text : '#444'; ctx.fillText(s.alive ? '✓' : '✗', x + w - 8, sy);
    }
    const sunk = fleet.ships.filter(s => !s.alive).length;
    ctx.font = `11px 'VT323'`; ctx.fillStyle = C.gold; ctx.textAlign = 'center'; ctx.fillText(`${sunk}/${fleet.ships.length} потоплено`, x + w / 2, y + 28 + fleet.ships.length * lh + 4);
  }

  private drawMessages(msgs: string[], h: number): void {
    const ly = h - 58; const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,5,10,0.7)'; ctx.fillRect(8, ly - 4, 500, 4 * 15 + 8);
    ctx.font = `13px 'VT323'`; ctx.textAlign = 'left';
    for (let i = 0; i < Math.min(4, msgs.length); i++) { ctx.fillStyle = '#aaa'; ctx.shadowColor = '#aaa'; ctx.shadowBlur = 2; ctx.fillText(`> ${msgs[i]}`, 14, ly + i * 15); }
    ctx.shadowBlur = 0;
  }

  private drawCRT(w: number, h: number, time: number): void {
    const ctx = this.ctx;
    // Scanlines
    ctx.fillStyle = C.scanline; for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1);
    // Vignette
    const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.8); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // Flicker
    const f = Math.sin(time * 0.0473) * 0.012 + Math.cos(time * 0.0317) * 0.008; ctx.fillStyle = `rgba(0,0,0,${Math.abs(f)})`; ctx.fillRect(0, 0, w, h);
    // Occasional line
    if (Math.sin(time * 0.0137) > 0.97) { ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(0, Math.floor(Math.random() * h), w, 2); }
  }

  private drawText(text: string, x: number, y: number, opts: { font?: string; color?: string; align?: CanvasTextAlign; glow?: number }): void {
    const ctx = this.ctx; ctx.font = opts.font || "14px 'VT323'"; ctx.fillStyle = opts.color || C.text; ctx.textAlign = opts.align || 'left'; ctx.textBaseline = 'middle';
    if (opts.glow) { ctx.shadowColor = opts.color || C.text; ctx.shadowBlur = opts.glow; }
    ctx.fillText(text, x, y); ctx.shadowBlur = 0;
  }
}
