// Cell states
export const CellState = { EMPTY: 0, SHIP: 1, HIT: 2, MISS: 3, SUNK: 4 } as const;
export type CellState = (typeof CellState)[keyof typeof CellState];

// Main game screens
export const Screen = {
  LOADING: 'LOADING',
  MAIN_MENU: 'MAIN_MENU',
  BOT_SETUP: 'BOT_SETUP',
  P1_SETUP: 'P1_SETUP',
  P2_SETUP: 'P2_SETUP',
  BATTLE: 'BATTLE',
  BATTLE_1V1: 'BATTLE_1V1',
  SETTINGS: 'SETTINGS',
  GAME_OVER: 'GAME_OVER',
  EXIT: 'EXIT',
} as const;
export type Screen = (typeof Screen)[keyof typeof Screen];

export const Difficulty = { EASY: 'EASY', HARD: 'HARD' } as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export const PlacementMode = { AUTO: 'AUTO', MANUAL: 'MANUAL' } as const;
export type PlacementMode = (typeof PlacementMode)[keyof typeof PlacementMode];

export const Orientation = { HORIZONTAL: 'HORIZONTAL', VERTICAL: 'VERTICAL' } as const;
export type Orientation = (typeof Orientation)[keyof typeof Orientation];

export interface Position { x: number; y: number; }
export interface Ship { id: number; size: number; positions: Position[]; hits: Position[]; isSunk: boolean; orientation: Orientation; }
export interface Cell { state: CellState; shipId: number | null; }
export interface FleetStatus { totalShips: number; sunkShips: number; ships: { size: number; name: string; isSunk: boolean; }[]; }
export interface PlayerState { grid: Cell[][]; ships: Ship[]; name: string; }

export const CONFIG = {
  GRID_SIZE: 10, CELL_SIZE: 32, CELL_GAP: 2,
  SHIPS: [{ size: 4, count: 1 }, { size: 3, count: 2 }, { size: 2, count: 3 }, { size: 1, count: 4 }],
  COLORS: {
    bg: '#0a0a0f', water: '#00ffff', playerShip: '#00ff41', hit: '#ff0040',
    miss: '#555555', cursor: '#ffff00', sunk: '#ff6600', gold: '#ffd700',
    text: '#e0e0e0', gridLine: 'rgba(0,255,65,0.25)', scanline: 'rgba(0,255,65,0.03)',
  },
  COLUMN_LABELS: ['А','Б','В','Г','Д','Е','Ж','З','И','К'],
  SHIP_NAMES: { 4: 'Линкор', 3: 'Крейсер', 2: 'Эсминец', 1: 'Торпедный катер' } as Record<number, string>,
  PIRATE_PHRASES: {
    hit: ['Прямо в цель!','БАБАХ! Попадание!','Корпус пробит!','Отличный выстрел!'],
    miss: ['Мимо...','Промах!','В воду!','Чёртов шторм...'],
    sunk: ['КОРАБЛЬ НА ДНО!','Потоплен!','Уничтожен!'],
    victory: ['ПОБЕДА!','Враг разбит!','Триумф!'],
    defeat: ['Поражение...','Флот уничтожен...'],
  } as const,
};

export function formatCoord(x: number, y: number): string { return `${CONFIG.COLUMN_LABELS[x]}${y + 1}`; }
export function getTotalShips(): number { return CONFIG.SHIPS.reduce((s, c) => s + c.count, 0); }
export function getRandomPhrase(cat: keyof typeof CONFIG.PIRATE_PHRASES): string { const arr = CONFIG.PIRATE_PHRASES[cat]; return arr[Math.floor(Math.random() * arr.length)]; }
