import { CONFIG, CellState, type Difficulty, type Cell, type Position, type Ship, type FleetStatus, Orientation } from './types';

// AI state for hard mode
export interface AIState { difficulty: Difficulty; mode: 'SEARCH' | 'TARGET' | 'DESTROY'; lastHit: Position | null; direction: Position | null; targets: Position[]; }

export function createAI(difficulty: Difficulty): AIState { return { difficulty, mode: 'SEARCH', lastHit: null, direction: null, targets: [] }; }

function isAvailable(grid: Cell[][], x: number, y: number): boolean { const size = CONFIG.GRID_SIZE; if (x < 0 || x >= size || y < 0 || y >= size) return false; const c = grid[y][x]; return c.state === CellState.EMPTY || c.state === CellState.SHIP; }

// Easy mode: random shot
export function easyShot(grid: Cell[][]): Position { const avail: Position[] = []; for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) if (grid[y][x].state === CellState.EMPTY || grid[y][x].state === CellState.SHIP) avail.push({ x, y }); return avail.length > 0 ? avail[Math.floor(Math.random() * avail.length)] : { x: 0, y: 0 }; }

// Hard mode: checkerboard search + hunt/destroy
export function hardShot(grid: Cell[][], ai: AIState): Position {
  const size = CONFIG.GRID_SIZE;
  if (ai.targets.length > 0) { while (ai.targets.length > 0) { const t = ai.targets.shift()!; if (isAvailable(grid, t.x, t.y)) return t; } }

  if (ai.lastHit && ai.mode !== 'SEARCH') {
    if (ai.direction) { const next = { x: ai.lastHit.x + ai.direction.x, y: ai.lastHit.y + ai.direction.y }; if (isAvailable(grid, next.x, next.y)) return next; }
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    if (ai.mode === 'DESTROY' && ai.lastHit && ai.direction) {
      const oppDir = { x: -ai.direction.x, y: -ai.direction.y }; let sx = ai.lastHit.x, sy = ai.lastHit.y;
      while (true) { const px = sx - ai.direction.x, py = sy - ai.direction.y; if (px < 0 || px >= size || py < 0 || py >= size || grid[py][px].state !== CellState.HIT) break; sx = px; sy = py; }
      const checkX = sx + oppDir.x, checkY = sy + oppDir.y; if (isAvailable(grid, checkX, checkY)) { ai.direction = oppDir; return { x: checkX, y: checkY }; }
    }
    if (ai.lastHit) for (const dir of dirs) { const next = { x: ai.lastHit.x + dir.x, y: ai.lastHit.y + dir.y }; if (isAvailable(grid, next.x, next.y)) ai.targets.push(next); }
    if (ai.targets.length > 0) return ai.targets.shift()!;
    ai.mode = 'SEARCH'; ai.lastHit = null; ai.direction = null;
  }

  const avail: Position[] = []; for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (grid[y][x].state === CellState.EMPTY || grid[y][x].state === CellState.SHIP) avail.push({ x, y });
  const checkerboard = avail.filter(p => (p.x + p.y) % 2 === 0); if (checkerboard.length > 0) return checkerboard[Math.floor(Math.random() * checkerboard.length)];
  if (avail.length > 0) return avail[Math.floor(Math.random() * avail.length)];
  return { x: 0, y: 0 };
}

export function updateAI(ai: AIState, pos: Position, isHit: boolean, isSunk: boolean, grid: Cell[][]): AIState {
  const newAi: AIState = { difficulty: ai.difficulty, mode: ai.mode, lastHit: ai.lastHit, direction: ai.direction, targets: [...ai.targets] }; const size = CONFIG.GRID_SIZE;
  if (isSunk) { newAi.mode = 'SEARCH'; newAi.lastHit = null; newAi.direction = null; newAi.targets = []; }
  else if (isHit) {
    if (newAi.mode === 'SEARCH') { newAi.mode = 'TARGET'; newAi.lastHit = { ...pos }; newAi.direction = null; for (const dir of [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }]) { const next = { x: pos.x + dir.x, y: pos.y + dir.y }; if (isAvailable(grid, next.x, next.y)) newAi.targets.push(next); } }
    else if (newAi.mode === 'TARGET' && newAi.lastHit) { newAi.hitDirection = { x: pos.x - newAi.lastHit.x, y: pos.y - newAi.lastHit.y }; newAi.mode = 'DESTROY'; newAi.lastHit = { ...pos }; if (newAi.direction) { const next = { x: pos.x + newAi.direction.x, y: pos.y + newAi.direction.y }; if (isAvailable(grid, next.x, next.y)) newAi.targets.push(next); } }
    else if (newAi.mode === 'DESTROY') { newAi.lastHit = { ...pos }; if (newAi.direction) { const next = { x: pos.x + newAi.direction.x, y: pos.y + newAi.direction.y }; if (isAvailable(grid, next.x, next.y)) newAi.targets = [next]; else newAi.targets = []; } }
  }
  else { if (newAi.mode === 'DESTROY' && newAi.direction && newAi.lastHit) { const oppDir = { x: -newAi.direction.x, y: -newAi.direction.y }; let sx = newAi.lastHit.x, sy = newAi.lastHit.y; while (true) { const px = sx - newAi.direction!.x, py = sy - newAi.direction!.y; if (px < 0 || px >= size || py < 0 || py >= size || grid[py][px].state !== CellState.HIT) break; sx = px; sy = py; } const cx = sx + oppDir.x, cy = sy + oppDir.y; if (isAvailable(grid, cx, cy)) { newAi.direction = oppDir; newAi.targets = [{ x: cx, y: cy }]; } else newAi.targets = []; } }
  return newAi;
}

export function createEmptyGrid(): Cell[][] { return Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => ({ state: CellState.EMPTY, shipId: null }))); }

export function isValidPlacement(grid: Cell[][], x: number, y: number, size: number, orientation: Orientation): boolean {
  const gridSize = grid.length;
  for (let i = 0; i < size; i++) {
    const px = orientation === Orientation.HORIZONTAL ? x + i : x;
    const py = orientation === Orientation.VERTICAL ? y + i : y;
    if (px < 0 || px >= gridSize || py < 0 || py >= gridSize) return false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = px + dx, ny = py + dy; if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && grid[ny][nx].state === CellState.SHIP) return false; }
  }
  return true;
}

export function placeShip(grid: Cell[][], x: number, y: number, size: number, orientation: Orientation, shipId: number): { grid: Cell[][]; ship: Ship } {
  const newGrid = grid.map(r => r.map(c => ({ ...c }))); const positions: Position[] = [];
  for (let i = 0; i < size; i++) { const px = orientation === Orientation.HORIZONTAL ? x + i : x; const py = orientation === Orientation.VERTICAL ? y + i : y; newGrid[py][px] = { state: CellState.SHIP, shipId }; positions.push({ x: px, y: py }); }
  return { grid: newGrid, ship: { id: shipId, size, positions, hits: [], isSunk: false, orientation } };
}

export function autoPlaceShips(grid: Cell[][], startId: number): { grid: Cell[][]; ships: Ship[] } {
  const newGrid = grid.map(r => r.map(c => ({ ...c }))); const ships: Ship[] = []; let shipId = startId;
  const shipSizes: number[] = []; for (const s of CONFIG.SHIPS) for (let i = 0; i < s.count; i++) shipSizes.push(s.size);
  for (const size of shipSizes) { let placed = false, attempts = 0; while (!placed && attempts < 1000) { attempts++; const orientation = Math.random() < 0.5 ? Orientation.HORIZONTAL : Orientation.VERTICAL; const maxX = orientation === Orientation.HORIZONTAL ? 10 - size : 10, maxY = orientation === Orientation.VERTICAL ? 10 - size : 10; const x = Math.floor(Math.random() * maxX), y = Math.floor(Math.random() * maxY); if (isValidPlacement(newGrid, x, y, size, orientation)) { const result = placeShip(newGrid, x, y, size, orientation, shipId); newGrid[result.ship.positions[0].y][result.ship.positions[0].x] = { state: CellState.SHIP, shipId }; for (const p of result.ship.positions) newGrid[p.y][p.x] = { state: CellState.SHIP, shipId }; ships.push(result.ship); shipId++; placed = true; } } }
  return { grid: newGrid, ships };
}

export function markAura(grid: Cell[][], ship: Ship): Cell[][] {
  const newGrid = grid.map(r => r.map(c => ({ ...c }))); const size = grid.length;
  for (const pos of ship.positions) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (dx === 0 && dy === 0) continue; const nx = pos.x + dx, ny = pos.y + dy; if (nx >= 0 && nx < size && ny >= 0 && ny < size && newGrid[ny][nx].state === CellState.EMPTY) newGrid[ny][nx] = { state: CellState.MISS, shipId: null }; }
  return newGrid;
}

export function allShipsSunk(ships: Ship[]): boolean { return ships.length > 0 && ships.every(s => s.isSunk); }

export function getFleetStatus(ships: Ship[]): FleetStatus {
  const sunkShips = ships.filter(s => s.isSunk).length;
  return { totalShips: ships.length, sunkShips, ships: ships.map(s => ({ size: s.size, name: CONFIG.SHIP_NAMES[s.size] || 'Корабль', isSunk: s.isSunk })) };
}
