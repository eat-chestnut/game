import { GameState } from '../state/GameState.js';

export class PauseSystem {
  constructor(scene) {
    this.scene = scene;
    this.pauseables = [];
    this.timerRegistry = new Set(); // 计时器去重守护
  }

  registerTimer(event) {
    if (!event) return;
    // 去重守护：防止重复注册同一计时器
    if (this.timerRegistry.has(event)) {
      console.warn('[PauseSystem] Attempted to register duplicate timer, skipping');
      return;
    }
    this.timerRegistry.add(event);
    this.pauseables.push(event);
  }

  unregisterTimer(event) {
    if (!event) return;
    this.timerRegistry.delete(event);
    this.pauseables = this.pauseables.filter(e => e !== event);
  }

  clearAllTimers() {
    this.timerRegistry.clear();
    this.pauseables = [];
  }

  setPaused(paused) {
    // 统一通过此方法读写暂停状态
    if (GameState.globals.isPaused === paused) {
      // 已经是目标状态，避免重复操作
      return;
    }
    
    GameState.globals.isPaused = paused;
    
    if (this.scene.physics?.world) {
      this.scene.physics.world.isPaused = paused;
    }
    
    // 清理已失效的计时器
    this.pauseables = this.pauseables.filter(evt => {
      if (!evt || !evt.paused !== undefined) {
        this.timerRegistry.delete(evt);
        return false;
      }
      evt.paused = paused;
      return true;
    });
    
    if (this.scene.tweens) {
      this.scene.tweens.timeScale = paused ? 0 : 1;
    }
    
    // 日志记录，方便调试竞态问题
    if (window.DEBUG_PAUSE) {
      console.log(`[PauseSystem] setPaused(${paused}) - active timers: ${this.pauseables.length}`);
    }
  }

  toggle() {
    this.setPaused(!GameState.globals.isPaused);
  }
}
