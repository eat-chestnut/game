import { GameState } from '../state/GameState.js';

/**
 * v6: 回放系统
 * 记录 RNG 种子、关键事件，支持 60s 窗口重放与分享码导出
 */
export class ReplaySystem {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config?.replay || {};
    this.enabled = this.config.enabled !== false;
    this.windowSec = this.config.windowSec || 60;
    this.export = this.config.export !== false;
    
    this.seed = Date.now();
    this.events = [];
    this.startTime = 0;
    this.recording = false;
    this.maxEvents = 1000; // 最大事件数限制
  }
  
  startRecording(seed = null) {
    if (!this.enabled) return;
    
    this.seed = seed || Date.now();
    this.events = [];
    this.startTime = this.scene.time.now;
    this.recording = true;
    
    // 记录初始状态
    this.recordEvent('init', {
      seed: this.seed,
      score: GameState.globals.score,
      wave: GameState.globals.wave,
      level: GameState.globals.level,
      skillState: { ...GameState.skillState }
    });
    
    console.log(`[Replay] Recording started with seed: ${this.seed}`);
  }
  
  stopRecording() {
    if (!this.recording) return;
    
    this.recording = false;
    
    // 记录结束状态
    this.recordEvent('end', {
      duration: this.scene.time.now - this.startTime,
      finalScore: GameState.globals.score,
      finalWave: GameState.globals.wave,
      finalKills: GameState.stats.totalKills
    });
    
    console.log(`[Replay] Recording stopped. Total events: ${this.events.length}`);
  }
  
  recordEvent(type, data = {}) {
    if (!this.recording || !this.enabled) return;
    
    // 检查是否超过窗口时间
    const elapsed = this.scene.time.now - this.startTime;
    if (elapsed > this.windowSec * 1000) {
      // 自动停止录制
      this.stopRecording();
      return;
    }
    
    // 限制事件数量
    if (this.events.length >= this.maxEvents) {
      console.warn('[Replay] Max events reached, skipping');
      return;
    }
    
    this.events.push({
      type,
      timestamp: elapsed,
      data
    });
  }
  
  // 记录关键游戏事件
  recordEnemyKilled(enemy) {
    this.recordEvent('enemy_killed', {
      x: enemy.x,
      y: enemy.y,
      hp: enemy.maxHp,
      elite: enemy.isElite || false
    });
  }
  
  recordSkillUpgrade(skillId, level) {
    this.recordEvent('skill_upgrade', {
      skillId,
      level
    });
  }
  
  recordWaveAdvance(wave) {
    this.recordEvent('wave_advance', {
      wave,
      score: GameState.globals.score,
      kills: GameState.stats.totalKills
    });
  }
  
  recordBossSpawn(wave) {
    this.recordEvent('boss_spawn', {
      wave
    });
  }
  
  recordPlayerHit(damage) {
    this.recordEvent('player_hit', {
      damage,
      hp: GameState.globals.hp
    });
  }
  
  // 生成分享码（压缩格式）
  generateShareCode() {
    if (!this.export || this.events.length === 0) return null;
    
    const snapshot = {
      v: '6.0', // 版本
      s: this.seed,
      d: this.windowSec,
      e: this.events.length,
      // 只导出关键统计
      stats: {
        score: GameState.globals.score,
        wave: GameState.globals.wave,
        kills: GameState.stats.totalKills
      }
    };
    
    // 使用 Base64 编码
    const json = JSON.stringify(snapshot);
    const encoded = btoa(json);
    
    console.log(`[Replay] Share code generated: ${encoded.substring(0, 20)}...`);
    return encoded;
  }
  
  // 从分享码加载
  loadFromShareCode(code) {
    try {
      const json = atob(code);
      const snapshot = JSON.parse(json);
      
      if (snapshot.v !== '6.0') {
        console.error('[Replay] Incompatible version:', snapshot.v);
        return false;
      }
      
      this.seed = snapshot.s;
      this.windowSec = snapshot.d;
      
      console.log(`[Replay] Loaded from share code. Seed: ${this.seed}, Duration: ${this.windowSec}s`);
      return true;
    } catch (e) {
      console.error('[Replay] Failed to load share code:', e);
      return false;
    }
  }
  
  // 导出完整回放数据（用于调试）
  exportFullReplay() {
    return {
      seed: this.seed,
      duration: this.windowSec,
      startTime: this.startTime,
      events: this.events
    };
  }
  
  // 获取回放统计
  getStats() {
    if (this.events.length === 0) return null;
    
    const init = this.events.find(e => e.type === 'init');
    const end = this.events.find(e => e.type === 'end');
    
    return {
      seed: this.seed,
      duration: end ? end.data.duration : 0,
      eventCount: this.events.length,
      initialState: init ? init.data : null,
      finalState: end ? end.data : null
    };
  }
  
  // 清空回放数据
  clear() {
    this.events = [];
    this.recording = false;
    this.startTime = 0;
  }
}
