/**
 * v7: 对象池追踪系统
 * 跟踪对象池的命中率与内存使用情况
 */
export class ObjectPoolTracker {
  constructor() {
    this.pools = {
      bullets: { hits: 0, misses: 0, active: 0, peak: 0 },
      enemies: { hits: 0, misses: 0, active: 0, peak: 0 },
      loot: { hits: 0, misses: 0, active: 0, peak: 0 },
      particles: { hits: 0, misses: 0, active: 0, peak: 0 }
    };
    
    this.startTime = Date.now();
    this.samples = [];
    this.maxSamples = 60; // 保留60秒历史
  }
  
  /**
   * 记录对象池命中
   */
  recordHit(poolName) {
    if (!this.pools[poolName]) return;
    
    this.pools[poolName].hits++;
  }
  
  /**
   * 记录对象池未命中（需要创建新对象）
   */
  recordMiss(poolName) {
    if (!this.pools[poolName]) return;
    
    this.pools[poolName].misses++;
  }
  
  /**
   * 更新对象池活跃数量
   */
  updateActive(poolName, count) {
    if (!this.pools[poolName]) return;
    
    this.pools[poolName].active = count;
    this.pools[poolName].peak = Math.max(this.pools[poolName].peak, count);
  }
  
  /**
   * 获取对象池命中率
   */
  getHitRate(poolName) {
    if (!this.pools[poolName]) return 0;
    
    const pool = this.pools[poolName];
    const total = pool.hits + pool.misses;
    
    return total > 0 ? (pool.hits / total * 100) : 0;
  }
  
  /**
   * 获取所有对象池统计
   */
  getAllStats() {
    const stats = {};
    
    Object.keys(this.pools).forEach(poolName => {
      const pool = this.pools[poolName];
      const hitRate = this.getHitRate(poolName);
      
      stats[poolName] = {
        hitRate: hitRate.toFixed(2) + '%',
        hits: pool.hits,
        misses: pool.misses,
        active: pool.active,
        peak: pool.peak
      };
    });
    
    return stats;
  }
  
  /**
   * 采样当前状态
   */
  sample() {
    const snapshot = {
      timestamp: Date.now(),
      pools: {}
    };
    
    Object.keys(this.pools).forEach(poolName => {
      const pool = this.pools[poolName];
      snapshot.pools[poolName] = {
        active: pool.active,
        hitRate: this.getHitRate(poolName)
      };
    });
    
    this.samples.push(snapshot);
    
    // 限制样本数量
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }
  
  /**
   * 获取历史趋势
   */
  getTrends() {
    if (this.samples.length === 0) return {};
    
    const trends = {};
    
    Object.keys(this.pools).forEach(poolName => {
      const values = this.samples.map(s => s.pools[poolName]?.active || 0);
      const hitRates = this.samples.map(s => s.pools[poolName]?.hitRate || 0);
      
      trends[poolName] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        max: Math.max(...values),
        min: Math.min(...values),
        avgHitRate: hitRates.reduce((a, b) => a + b, 0) / hitRates.length
      };
    });
    
    return trends;
  }
  
  /**
   * 重置统计
   */
  reset() {
    Object.keys(this.pools).forEach(poolName => {
      this.pools[poolName] = { hits: 0, misses: 0, active: 0, peak: 0 };
    });
    
    this.samples = [];
    this.startTime = Date.now();
  }
  
  /**
   * 生成报告
   */
  generateReport() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const stats = this.getAllStats();
    const trends = this.getTrends();
    
    return {
      elapsed: `${elapsed.toFixed(1)}s`,
      pools: stats,
      trends
    };
  }
  
  /**
   * 检查是否需要优化
   */
  needsOptimization() {
    const warnings = [];
    
    Object.keys(this.pools).forEach(poolName => {
      const hitRate = this.getHitRate(poolName);
      
      // 命中率低于70%需要优化
      if (hitRate < 70 && this.pools[poolName].hits + this.pools[poolName].misses > 100) {
        warnings.push({
          pool: poolName,
          hitRate: hitRate.toFixed(2) + '%',
          reason: 'Low hit rate',
          suggestion: 'Increase pool size or improve recycling'
        });
      }
      
      // 峰值过高
      if (this.pools[poolName].peak > 200) {
        warnings.push({
          pool: poolName,
          peak: this.pools[poolName].peak,
          reason: 'High peak usage',
          suggestion: 'Check for leaks or optimize spawning'
        });
      }
    });
    
    return warnings;
  }
}
