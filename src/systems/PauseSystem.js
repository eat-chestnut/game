import { GameState } from '../state/GameState.js';

export class PauseSystem {
  constructor(scene) {
    this.scene = scene;
    this.pauseables = [];
  }

  registerTimer(event) {
    if (!event) return;
    this.pauseables.push(event);
  }

  setPaused(paused) {
    GameState.globals.isPaused = paused;
    this.scene.physics.world.isPaused = paused;
    this.pauseables.forEach(evt => {
      if (evt) evt.paused = paused;
    });
    if (paused) {
      this.scene.tweens.timeScale = 0;
    } else {
      this.scene.tweens.timeScale = 1;
    }
  }

  toggle() {
    this.setPaused(!GameState.globals.isPaused);
  }
}
