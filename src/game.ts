import { CONFIG, CellState, Screen, Difficulty, PlacementMode, Orientation, type Position, type Ship, type Cell, type PlayerState, formatCoord, getTotalShips, getRandomPhrase } from './types';
import { createAI, easyShot, hardShot, updateAI, createEmptyGrid, isValidPlacement, placeShip, autoPlaceShips, markAura, allShipsSunk, getFleetStatus, type AIState } from './ai';
import { Renderer, type GameState as RenderState, type BattleState, type Battle1V1State, type FleetStatus as RenderFleet } from './renderer';
import { InputHandler } from './input';

// CellState converter
function toRState(s: CellState): 'EMPTY' | 'SHIP' | 'HIT' | 'MISS' | 'SUNK' {
  switch (s) { case 0: return 'EMPTY'; case 1: return 'SHIP'; case 2: return 'HIT'; case 3: return 'MISS'; case 4: return 'SUNK'; }
}
function toRGrid(grid: Cell[][]) { return grid.map(row => row.map(c => ({ state: toRState(c.state) }))); }
function toRFleet(ships: Ship[]): RenderFleet { return { ships: ships.map(s => ({ size: s.size, alive: !s.isSunk })) }; }

interface Msg { text: string; color: string; }

export class Game {
  private renderer: Renderer;
  private input: InputHandler;
  private screen: Screen = Screen.LOADING;
  private loadStartTime = 0;
  private menuIndex = 0;
  private botDifficulty: Difficulty = Difficulty.HARD;
  private botPlacement: PlacementMode = PlacementMode.MANUAL;
  private botSetupRow = 0;
  private player: PlayerState = { grid: createEmptyGrid(), ships: [], name: 'Игрок' };
  private enemy: PlayerState = { grid: createEmptyGrid(), ships: [], name: 'Бот' };
  private player2: PlayerState = { grid: createEmptyGrid(), ships: [], name: 'Игрок 2' };
  private ai: AIState = createAI(Difficulty.HARD);
  private placeCursor: Position = { x: 0, y: 0 };
  private placeOrientation: Orientation = Orientation.HORIZONTAL;
  private placeQueue: number[] = [];
  private placeIndex = 0;
  private placingPlayer: 1 | 2 = 1;
  private isPlayerTurn = true;
  private battleCursor: Position = { x: 0, y: 0 };
  private messages: Msg[] = [];
  private isVictory = false;
  private is1v1 = false;
  private currentPlayer: 1 | 2 = 1;
  private showingTransition = false;
  private transitionTimer = 0;
  private winnerName = '';

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new InputHandler();
    this.loadStartTime = performance.now();
    window.addEventListener('resize', () => this.renderer.resize());
  }

  update(dt: number, time: number): void {
    switch (this.screen) {
      case Screen.LOADING: if (time - this.loadStartTime > 2500) this.screen = Screen.MAIN_MENU; break;
      case Screen.MAIN_MENU: this.updateMainMenu(); break;
      case Screen.BOT_SETUP: this.updateBotSetup(); break;
      case Screen.P1_SETUP: this.updatePlacement(1); break;
      case Screen.P2_SETUP: this.updatePlacement(2); break;
      case Screen.BATTLE: this.updateBattle(); break;
      case Screen.BATTLE_1V1: this.updateBattle1v1(dt); break;
      case Screen.SETTINGS: if (this.input.isJustPressed('Escape') || this.input.isJustPressed('Enter')) this.screen = Screen.MAIN_MENU; break;
      case Screen.GAME_OVER: if (this.input.isJustPressed('Enter')) { this.screen = Screen.MAIN_MENU; this.resetGame(); } break;
    }
    this.input.reset();
  }

  render(time: number): void { this.renderer.render(this.buildRenderState(time), time); }

  private buildRenderState(time: number): RenderState {
    const base: RenderState = { screen: this.screen as any, selectedIndex: this.menuIndex };
    switch (this.screen) {
      case Screen.BOT_SETUP: return { ...base, difficulty: this.botDifficulty === Difficulty.EASY ? 'easy' : 'hard', placement: this.botPlacement === PlacementMode.AUTO ? 'auto' : 'manual', selectedRow: this.botSetupRow };
      case Screen.BATTLE: return { ...base, battleState: { playerGrid: toRGrid(this.player.grid), enemyGrid: toRGrid(this.enemy.grid), playerFleet: toRFleet(this.player.ships), enemyFleet: toRFleet(this.enemy.ships), cursor: this.isPlayerTurn ? { ...this.battleCursor } : null, messages: this.messages.slice(-4).map(m => m.text), playerTurn: this.isPlayerTurn }, isVictory: this.isVictory };
      case Screen.BATTLE_1V1: return { ...base, battle1v1State: { player1Grid: toRGrid(this.player.grid), player2Grid: toRGrid(this.player2.grid), player1Fleet: toRFleet(this.player.ships), player2Fleet: toRFleet(this.player2.ships), cursor: this.showingTransition ? null : { ...this.battleCursor }, messages: this.messages.slice(-4).map(m => m.text), player1Turn: this.currentPlayer === 1, timerProgress: this.showingTransition ? 0 : 1 }, isVictory: this.isVictory };
      case Screen.GAME_OVER: return { ...base, isVictory: this.isVictory };
      default: return base;
    }
  }

  private updateMainMenu(): void {
    if (this.input.isJustPressed('ArrowUp')) this.menuIndex = (this.menuIndex + 3) % 4;
    if (this.input.isJustPressed('ArrowDown')) this.menuIndex = (this.menuIndex + 1) % 4;
    if (this.input.isJustPressed('Enter')) {
      switch (this.menuIndex) {
        case 0: this.screen = Screen.BOT_SETUP; this.botSetupRow = 0; break;
        case 1: this.is1v1 = true; this.start1v1Setup(); break;
        case 2: this.screen = Screen.SETTINGS; break;
        case 3: this.screen = Screen.EXIT; break;
      }
    }
  }

  private updateBotSetup(): void {
    if (this.input.isJustPressed('ArrowUp')) this.botSetupRow = (this.botSetupRow + 2) % 3;
    if (this.input.isJustPressed('ArrowDown')) this.botSetupRow = (this.botSetupRow + 1) % 3;
    if (this.input.isJustPressed('ArrowLeft') || this.input.isJustPressed('ArrowRight')) {
      if (this.botSetupRow === 0) this.botDifficulty = this.botDifficulty === Difficulty.EASY ? Difficulty.HARD : Difficulty.EASY;
      else if (this.botSetupRow === 1) this.botPlacement = this.botPlacement === PlacementMode.AUTO ? PlacementMode.MANUAL : PlacementMode.AUTO;
    }
    if (this.input.isJustPressed('Enter') && this.botSetupRow === 2) this.startBotBattle();
  }

  private startBotBattle(): void {
    this.is1v1 = false;
    this.player = { grid: createEmptyGrid(), ships: [], name: 'Игрок' };
    this.enemy = { grid: createEmptyGrid(), ships: [], name: 'Бот' };
    this.ai = createAI(this.botDifficulty);
    if (this.botPlacement === PlacementMode.AUTO) {
      const r = autoPlaceShips(this.player.grid, 0); this.player.grid = r.grid; this.player.ships = r.ships;
      this.startBotBattleAfterPlacement();
    } else {
      this.startPlacementFor(1);
    }
  }

  private startBotBattleAfterPlacement(): void {
    const e = autoPlaceShips(this.enemy.grid, 0); this.enemy.grid = e.grid; this.enemy.ships = e.ships;
    this.isPlayerTurn = Math.random() < 0.5; this.battleCursor = { x: 0, y: 0 }; this.messages = [];
    this.addMessage(getRandomPhrase('victory' as any)); this.screen = Screen.BATTLE;
  }

  private start1v1Setup(): void {
    this.player = { grid: createEmptyGrid(), ships: [], name: 'Игрок 1' };
    this.player2 = { grid: createEmptyGrid(), ships: [], name: 'Игрок 2' };
    this.placingPlayer = 1; this.startPlacementFor(1);
  }

  private startPlacementFor(pn: 1 | 2): void {
    this.placeCursor = { x: 0, y: 0 }; this.placeOrientation = Orientation.HORIZONTAL; this.placeIndex = 0;
    this.placeQueue = []; for (const s of CONFIG.SHIPS) for (let i = 0; i < s.count; i++) this.placeQueue.push(s.size);
    const p = pn === 1 ? this.player : this.player2; p.grid = createEmptyGrid(); p.ships = [];
    this.placingPlayer = pn; this.screen = pn === 1 ? Screen.P1_SETUP : Screen.P2_SETUP;
  }

  private updatePlacement(pn: 1 | 2): void {
    const p = pn === 1 ? this.player : this.player2; const gs = CONFIG.GRID_SIZE;
    if (this.input.isJustPressed('ArrowUp')) this.placeCursor.y = Math.max(0, this.placeCursor.y - 1);
    if (this.input.isJustPressed('ArrowDown')) this.placeCursor.y = Math.min(gs - 1, this.placeCursor.y + 1);
    if (this.input.isJustPressed('ArrowLeft')) this.placeCursor.x = Math.max(0, this.placeCursor.x - 1);
    if (this.input.isJustPressed('ArrowRight')) this.placeCursor.x = Math.min(gs - 1, this.placeCursor.x + 1);
    if (this.input.isJustPressed(' ')) this.placeOrientation = this.placeOrientation === Orientation.HORIZONTAL ? Orientation.VERTICAL : Orientation.HORIZONTAL;
    if (this.input.isJustPressed('Enter') && this.placeIndex < this.placeQueue.length) {
      const size = this.placeQueue[this.placeIndex];
      if (isValidPlacement(p.grid, this.placeCursor.x, this.placeCursor.y, size, this.placeOrientation)) {
        const r = placeShip(p.grid, this.placeCursor.x, this.placeCursor.y, size, this.placeOrientation, p.ships.length);
        p.grid = r.grid; p.ships.push(r.ship); this.placeIndex++;
        if (this.placeIndex >= this.placeQueue.length) setTimeout(() => this.onPlacementDone(pn), 800);
      }
    }
    if (this.input.isJustPressed('r') || this.input.isJustPressed('R')) {
      const r = autoPlaceShips(p.grid, p.ships.length); p.grid = r.grid; for (const s of r.ships) p.ships.push(s); this.placeIndex = this.placeQueue.length;
      setTimeout(() => this.onPlacementDone(pn), 800);
    }
  }

  private onPlacementDone(pn: 1 | 2): void {
    if (this.is1v1) { if (pn === 1) this.startPlacementFor(2); else this.start1v1Battle(); }
    else this.startBotBattleAfterPlacement();
  }

  private start1v1Battle(): void {
    this.currentPlayer = 1; this.isPlayerTurn = true; this.battleCursor = { x: 0, y: 0 };
    this.showingTransition = false; this.messages = []; this.screen = Screen.BATTLE_1V1;
  }

  private updateBattle(): void {
    if (this.isPlayerTurn) { if (this.updatePlayerInput(this.player, this.enemy, true)) return; }
    else { setTimeout(() => { const pos = this.ai.difficulty === Difficulty.EASY ? easyShot(this.player.grid) : hardShot(this.player.grid, this.ai); this.fireAt(this.player, pos.x, pos.y, true); this.isPlayerTurn = true; }, 600); this.isPlayerTurn = true; }
  }

  private updateBattle1v1(dt: number): void {
    if (this.showingTransition) { this.transitionTimer += dt; if (this.transitionTimer > 2000) this.showingTransition = false; return; }
    const attacker = this.currentPlayer === 1 ? this.player : this.player2;
    const defender = this.currentPlayer === 1 ? this.player2 : this.player;
    if (this.updatePlayerInput(attacker, defender, false)) { this.showingTransition = true; this.transitionTimer = 0; this.currentPlayer = this.currentPlayer === 1 ? 2 : 1; }
  }

  private updatePlayerInput(_attacker: PlayerState, defender: PlayerState, vsBot: boolean): boolean {
    const gs = CONFIG.GRID_SIZE;
    if (this.input.isJustPressed('ArrowUp')) this.battleCursor.y = Math.max(0, this.battleCursor.y - 1);
    if (this.input.isJustPressed('ArrowDown')) this.battleCursor.y = Math.min(gs - 1, this.battleCursor.y + 1);
    if (this.input.isJustPressed('ArrowLeft')) this.battleCursor.x = Math.max(0, this.battleCursor.x - 1);
    if (this.input.isJustPressed('ArrowRight')) this.battleCursor.x = Math.min(gs - 1, this.battleCursor.x + 1);
    if (this.input.isJustPressed('Enter')) return this.fireAt(defender, this.battleCursor.x, this.battleCursor.y, vsBot);
    return false;
  }

  private fireAt(target: PlayerState, x: number, y: number, vsBot: boolean): boolean {
    const cell = target.grid[y][x];
    if (cell.state === CellState.HIT || cell.state === CellState.MISS || cell.state === CellState.SUNK) { this.addMessage('Сюда уже стреляли!'); return false; }
    if (cell.state === CellState.SHIP) {
      target.grid[y][x] = { state: CellState.HIT, shipId: cell.shipId };
      const ship = target.ships.find(s => s.id === cell.shipId);
      if (ship) {
        ship.hits.push({ x, y });
        if (ship.hits.length === ship.size) {
          ship.isSunk = true; for (const p of ship.positions) target.grid[p.y][p.x] = { state: CellState.SUNK, shipId: ship.id }; target.grid = markAura(target.grid, ship);
          this.addMessage(`УБИЛ! ${CONFIG.SHIP_NAMES[ship.size]} потоплен!`);
        } else { this.addMessage(`РАНИЛ! ${CONFIG.SHIP_NAMES[ship.size]} на ${formatCoord(x, y)}!`); }
      }
      if (allShipsSunk(target.ships)) { this.isVictory = true; setTimeout(() => this.screen = Screen.GAME_OVER, 1500); }
      return true;
    } else {
      target.grid[y][x] = { state: CellState.MISS, shipId: null }; this.addMessage(`Мимо! ${formatCoord(x, y)}`); if (vsBot) this.isPlayerTurn = false; return true;
    }
  }

  private addMessage(text: string): void { this.messages.push({ text, color: '#e0e0e0' }); if (this.messages.length > 20) this.messages.shift(); }
  private resetGame(): void { this.player = { grid: createEmptyGrid(), ships: [], name: 'Игрок' }; this.enemy = { grid: createEmptyGrid(), ships: [], name: 'Бот' }; this.player2 = { grid: createEmptyGrid(), ships: [], name: 'Игрок 2' }; this.messages = []; this.isVictory = false; this.is1v1 = false; this.menuIndex = 0; }
}
