export class InputHandler {
  keys: Set<string> = new Set();
  justPressed: Set<string> = new Set();

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.justPressed.add(e.key);
      this.keys.add(e.key);
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key));
  }

  isDown(key: string): boolean { return this.keys.has(key); }
  isJustPressed(key: string): boolean { const p = this.justPressed.has(key); this.justPressed.delete(key); return p; }
  reset(): void { this.justPressed.clear(); }
}
