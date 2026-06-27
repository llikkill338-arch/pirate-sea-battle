import { Game } from './game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas #game not found');

const game = new Game(canvas);

let lastTime = performance.now();
function loop(now: number) {
  const dt = now - lastTime;
  lastTime = now;
  game.update(dt, now);
  game.render(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
