import { GameState } from '../state/GameState.js';

/**
 * v8: 离线排行榜系统
 * 管理日榜/周榜/历史最佳，支持每日试炼维度
 */
export class LeaderboardSystem {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config?.config || {
      maxEntries: { daily: 10, weekly: 20, allTime: 50 },
      sortBy: 'score',
      sortOrder: 'desc'
    };
    
    // 初始化排行榜数据
    if (!GameState.leaderboard) {
      GameState.leaderboard = {
        daily: [],
        weekly: [],
        allTime: [],
        dailyChallenge: {}
      };
    }
  }
  
  /**
   * 加载排行榜配置
   */
  static async loadConfig() {
    try {
      const response = await fetch('./leaderboard.json');
      return await response.json();
    } catch (error) {
      console.error('[Leaderboard] Failed to load config:', error);
      return {
        config: {
          maxEntries: { daily: 10, weekly: 20, allTime: 50 },
          sortBy: 'score',
          sortOrder: 'desc'
        },
        daily: [],
        weekly: [],
        allTime: [],
        dailyChallenge: {}
      };
    }
  }
  
  /**
   * 提交分数到排行榜
   * @param {object} entry - 排行榜条目 { score, wave, seed, replay, timestamp, player }
   */
  submitScore(entry) {
    const timestamp = entry.timestamp || Date.now();
    const dateKey = this.getDateKey(timestamp);
    const weekKey = this.getWeekKey(timestamp);
    
    // 完整条目
    const fullEntry = {
      player: entry.player || 'Player',
      score: entry.score || 0,
      wave: entry.wave || 0,
      seed: entry.seed || null,
      replay: entry.replay || null,
      timestamp: timestamp,
      date: dateKey
    };
    
    // 添加到各个榜单
    this.addToLeaderboard('daily', fullEntry, dateKey);
    this.addToLeaderboard('weekly', fullEntry, weekKey);
    this.addToLeaderboard('allTime', fullEntry);
    
    // 如果是每日试炼，单独记录
    if (GameState.dailyChallenge?.active) {
      const challengeKey = GameState.dailyChallenge.seed || dateKey;
      this.addToDailyChallengeLeaderboard(challengeKey, fullEntry);
    }
    
    console.log('[Leaderboard] Score submitted:', fullEntry);
    
    // 持久化
    this.save();
    
    return this.getRank('allTime', entry.score);
  }
  
  /**
   * 添加到指定榜单
   */
  addToLeaderboard(type, entry, filterKey = null) {
    if (!GameState.leaderboard[type]) {
      GameState.leaderboard[type] = [];
    }
    
    // 日榜和周榜需要过滤旧数据
    if (filterKey) {
      GameState.leaderboard[type] = GameState.leaderboard[type].filter(e => {
        if (type === 'daily') {
          return this.getDateKey(e.timestamp) === filterKey;
        } else if (type === 'weekly') {
          return this.getWeekKey(e.timestamp) === filterKey;
        }
        return true;
      });
    }
    
    // 添加新条目
    GameState.leaderboard[type].push(entry);
    
    // 排序
    this.sortLeaderboard(type);
    
    // 限制条目数量
    const maxEntries = this.config.maxEntries[type] || 50;
    if (GameState.leaderboard[type].length > maxEntries) {
      GameState.leaderboard[type] = GameState.leaderboard[type].slice(0, maxEntries);
    }
  }
  
  /**
   * 添加到每日试炼排行榜
   */
  addToDailyChallengeLeaderboard(challengeKey, entry) {
    if (!GameState.leaderboard.dailyChallenge[challengeKey]) {
      GameState.leaderboard.dailyChallenge[challengeKey] = [];
    }
    
    GameState.leaderboard.dailyChallenge[challengeKey].push(entry);
    
    // 排序
    GameState.leaderboard.dailyChallenge[challengeKey].sort((a, b) => {
      return b.score - a.score;
    });
    
    // 限制条目数量
    const maxEntries = this.config.maxEntries.daily || 10;
    if (GameState.leaderboard.dailyChallenge[challengeKey].length > maxEntries) {
      GameState.leaderboard.dailyChallenge[challengeKey] = 
        GameState.leaderboard.dailyChallenge[challengeKey].slice(0, maxEntries);
    }
  }
  
  /**
   * 排序榜单
   */
  sortLeaderboard(type) {
    const sortBy = this.config.sortBy || 'score';
    const sortOrder = this.config.sortOrder || 'desc';
    
    GameState.leaderboard[type].sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;
      
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
  }
  
  /**
   * 获取排名
   */
  getRank(type, score) {
    if (!GameState.leaderboard[type]) return -1;
    
    const sortedScores = GameState.leaderboard[type]
      .map(e => e.score)
      .sort((a, b) => b - a);
    
    const rank = sortedScores.findIndex(s => s <= score) + 1;
    return rank === 0 ? sortedScores.length + 1 : rank;
  }
  
  /**
   * 获取榜单
   */
  getLeaderboard(type, limit = null) {
    const leaderboard = GameState.leaderboard[type] || [];
    
    if (limit && limit > 0) {
      return leaderboard.slice(0, limit);
    }
    
    return leaderboard;
  }
  
  /**
   * 获取每日试炼榜单
   */
  getDailyChallengeLeaderboard(challengeKey = null) {
    if (!challengeKey) {
      // 返回今天的每日试炼榜单
      const today = this.getDateKey(Date.now());
      challengeKey = GameState.dailyChallenge?.seed || today;
    }
    
    return GameState.leaderboard.dailyChallenge[challengeKey] || [];
  }
  
  /**
   * 获取玩家最佳成绩
   */
  getPlayerBest(playerName = 'Player') {
    const allTimeEntries = GameState.leaderboard.allTime || [];
    const playerEntries = allTimeEntries.filter(e => e.player === playerName);
    
    if (playerEntries.length === 0) return null;
    
    return playerEntries.reduce((best, current) => {
      return (current.score > best.score) ? current : best;
    });
  }
  
  /**
   * 生成分享码（种子 + 回放码）
   */
  generateShareCode(entry) {
    const data = {
      seed: entry.seed,
      replay: entry.replay,
      score: entry.score,
      wave: entry.wave,
      timestamp: entry.timestamp
    };
    
    // 简单的 base64 编码
    const json = JSON.stringify(data);
    const encoded = btoa(json);
    
    return encoded;
  }
  
  /**
   * 解析分享码
   */
  parseShareCode(shareCode) {
    try {
      const decoded = atob(shareCode);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('[Leaderboard] Failed to parse share code:', error);
      return null;
    }
  }
  
  /**
   * 验证回放（QA用，60秒验证）
   */
  async verifyReplay(shareCode) {
    const data = this.parseShareCode(shareCode);
    if (!data) return { valid: false, reason: 'Invalid share code' };
    
    // 这里应该启动回放验证
    // 简化处理：返回数据供人工检查
    console.log('[Leaderboard] Verify replay data:', data);
    
    return {
      valid: true,
      data: data,
      message: 'Replay data extracted, manual verification needed'
    };
  }
  
  /**
   * 清理过期数据
   */
  cleanupOldData() {
    const now = Date.now();
    const today = this.getDateKey(now);
    const thisWeek = this.getWeekKey(now);
    
    // 清理日榜
    if (GameState.leaderboard.daily) {
      GameState.leaderboard.daily = GameState.leaderboard.daily.filter(e => {
        return this.getDateKey(e.timestamp) === today;
      });
    }
    
    // 清理周榜
    if (GameState.leaderboard.weekly) {
      GameState.leaderboard.weekly = GameState.leaderboard.weekly.filter(e => {
        return this.getWeekKey(e.timestamp) === thisWeek;
      });
    }
    
    // 清理超过30天的每日试炼榜单
    if (GameState.leaderboard.dailyChallenge) {
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
      
      Object.keys(GameState.leaderboard.dailyChallenge).forEach(key => {
        const entries = GameState.leaderboard.dailyChallenge[key];
        if (entries.length > 0) {
          const latestTimestamp = Math.max(...entries.map(e => e.timestamp));
          if (latestTimestamp < thirtyDaysAgo) {
            delete GameState.leaderboard.dailyChallenge[key];
          }
        }
      });
    }
    
    console.log('[Leaderboard] Old data cleaned up');
  }
  
  /**
   * 获取日期键 (YYYY-MM-DD)
   */
  getDateKey(timestamp) {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  }
  
  /**
   * 获取周键 (YYYY-Www)
   */
  getWeekKey(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }
  
  /**
   * 获取周数
   */
  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
  
  /**
   * 保存到本地存储
   */
  save() {
    try {
      const data = {
        daily: GameState.leaderboard.daily,
        weekly: GameState.leaderboard.weekly,
        allTime: GameState.leaderboard.allTime,
        dailyChallenge: GameState.leaderboard.dailyChallenge,
        lastUpdated: Date.now()
      };
      
      localStorage.setItem('leaderboard', JSON.stringify(data));
    } catch (error) {
      console.error('[Leaderboard] Failed to save:', error);
    }
  }
  
  /**
   * 从本地存储加载
   */
  load() {
    try {
      const data = localStorage.getItem('leaderboard');
      if (data) {
        const parsed = JSON.parse(data);
        GameState.leaderboard = {
          daily: parsed.daily || [],
          weekly: parsed.weekly || [],
          allTime: parsed.allTime || [],
          dailyChallenge: parsed.dailyChallenge || {}
        };
        
        // 清理过期数据
        this.cleanupOldData();
        
        console.log('[Leaderboard] Data loaded from localStorage');
      }
    } catch (error) {
      console.error('[Leaderboard] Failed to load:', error);
    }
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return {
      dailyCount: (GameState.leaderboard.daily || []).length,
      weeklyCount: (GameState.leaderboard.weekly || []).length,
      allTimeCount: (GameState.leaderboard.allTime || []).length,
      dailyChallengeCount: Object.keys(GameState.leaderboard.dailyChallenge || {}).length,
      highestScore: this.getHighestScore(),
      averageScore: this.getAverageScore()
    };
  }
  
  /**
   * 获取最高分
   */
  getHighestScore() {
    const allTime = GameState.leaderboard.allTime || [];
    if (allTime.length === 0) return 0;
    
    return Math.max(...allTime.map(e => e.score));
  }
  
  /**
   * 获取平均分
   */
  getAverageScore() {
    const allTime = GameState.leaderboard.allTime || [];
    if (allTime.length === 0) return 0;
    
    const total = allTime.reduce((sum, e) => sum + e.score, 0);
    return Math.round(total / allTime.length);
  }
}
