import { GameState } from '../state/GameState.js';

export class PauseSystem {
  constructor(scene) {
    this.scene = scene;
    this.pauseables = [];
    this.timerRegistry = new Set(); // 计时器去重守护
    this.pauseStackCount = 0; // v6: 嵌套暂停计数
    this.pauseReasons = new Set(); // v6: 暂停原因追踪（'panel'/'tutorial'/'boss'/'blur'）
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

  setPaused(paused, reason = 'manual') {
    // v6: 支持嵌套暂停计数
    if (paused) {
      this.pauseStackCount++;
      this.pauseReasons.add(reason);
    } else {
      this.pauseStackCount = Math.max(0, this.pauseStackCount - 1);
      this.pauseReasons.delete(reason);
    }
    
    // 只有当计数归零时才真正恢复
    const shouldBePaused = this.pauseStackCount > 0;
    
    if (GameState.globals.isPaused === shouldBePaused) {
      // 已经是目标状态，避免重复操作
      return;
    }
    
    GameState.globals.isPaused = shouldBePaused;
    
    if (this.scene.physics?.world) {
      this.scene.physics.world.isPaused = shouldBePaused;
    }
    
    // 清理已失效的计时器
    this.pauseables = this.pauseables.filter(evt => {
      if (!evt || evt.paused === undefined) {
        this.timerRegistry.delete(evt);
        return false;
      }
      evt.paused = shouldBePaused;
      return true;
    });
    
    if (this.scene.tweens) {
      this.scene.tweens.timeScale = shouldBePaused ? 0 : 1;
    }
    
    // v6: 详细日志记录
    if (window.DEBUG_PAUSE) {
      console.log(`[PauseSystem] setPaused(${paused}, "${reason}") - stack: ${this.pauseStackCount}, reasons: [${Array.from(this.pauseReasons).join(', ')}], active timers: ${this.pauseables.length}`);
    }
  }
  
  // v6: 重置暂停计数（用于场景切换）
  resetPauseStack() {
    this.pauseStackCount = 0;
    this.pauseReasons.clear();
    GameState.globals.isPaused = false;
    if (this.scene.physics?.world) {
      this.scene.physics.world.isPaused = false;
    }
  }

  toggle() {
    this.setPaused(!GameState.globals.isPaused);
  }
}
