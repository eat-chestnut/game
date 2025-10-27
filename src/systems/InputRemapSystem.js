import { GameState } from '../state/GameState.js';

/**
 * v8: 输入映射系统
 * 支持手柄/键鼠/触摸的自定义按键映射
 */
export class InputRemapSystem {
  constructor(scene) {
    this.scene = scene;
    
    // 默认按键映射
    this.defaultBindings = {
      keyboard: {
        pause: 'ESC',
        confirm: 'ENTER',
        cancel: 'ESC',
        skillUp: 'W',
        skillDown: 'S',
        skillSelect: 'ENTER',
        menuToggle: 'TAB',
        equipmentPanel: 'I',
        achievementPanel: 'A',
        leaderboardPanel: 'L'
      },
      gamepad: {
        pause: 'START',
        confirm: 'A',
        cancel: 'B',
        skillUp: 'DPAD_UP',
        skillDown: 'DPAD_DOWN',
        skillSelect: 'A',
        menuToggle: 'MENU',
        equipmentPanel: 'X',
        achievementPanel: 'Y',
        leaderboardPanel: 'LB'
      },
      touch: {
        longPressDuration: 200, // ms
        doubleTapDelay: 300, // ms
        tapRadius: 44 // px
      }
    };
    
    // 初始化输入绑定
    if (!GameState.inputBindings) {
      GameState.inputBindings = JSON.parse(JSON.stringify(this.defaultBindings));
    }
    
    // 当前输入模式
    this.currentMode = 'keyboard'; // keyboard / gamepad / touch
    
    // 触摸状态
    this.touchState = {
      lastTapTime: 0,
      lastTapPosition: null,
      isLongPress: false,
      longPressTimer: null
    };
    
    // 手柄按键映射
    this.gamepadButtons = {
      0: 'A',
      1: 'B',
      2: 'X',
      3: 'Y',
      4: 'LB',
      5: 'RB',
      6: 'LT',
      7: 'RT',
      8: 'MENU',
      9: 'START',
      12: 'DPAD_UP',
      13: 'DPAD_DOWN',
      14: 'DPAD_LEFT',
      15: 'DPAD_RIGHT'
    };
    
    this.setupInputListeners();
  }
  
  /**
   * 设置输入监听
   */
  setupInputListeners() {
    // 键盘监听
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.on('keydown', (event) => {
        this.onKeyDown(event);
      });
    }
    
    // 手柄监听
    if (this.scene.input.gamepad) {
      this.scene.input.gamepad.on('down', (pad, button, index) => {
        this.onGamepadButtonDown(pad, button, index);
      });
      
      this.scene.input.gamepad.on('connected', (pad) => {
        console.log('[InputRemap] Gamepad connected:', pad.id);
        this.currentMode = 'gamepad';
      });
    }
    
    // 触摸监听
    if (this.scene.input.touch) {
      this.scene.input.on('pointerdown', (pointer) => {
        this.onTouchStart(pointer);
      });
      
      this.scene.input.on('pointerup', (pointer) => {
        this.onTouchEnd(pointer);
      });
    }
  }
  
  /**
   * 键盘按键处理
   */
  onKeyDown(event) {
    this.currentMode = 'keyboard';
    
    const key = event.key.toUpperCase();
    const bindings = GameState.inputBindings.keyboard;
    
    // 查找匹配的动作
    Object.keys(bindings).forEach(action => {
      if (bindings[action] === key) {
        this.triggerAction(action);
      }
    });
  }
  
  /**
   * 手柄按键处理
   */
  onGamepadButtonDown(pad, button, index) {
    this.currentMode = 'gamepad';
    
    const buttonName = this.gamepadButtons[index];
    if (!buttonName) return;
    
    const bindings = GameState.inputBindings.gamepad;
    
    // 查找匹配的动作
    Object.keys(bindings).forEach(action => {
      if (bindings[action] === buttonName) {
        this.triggerAction(action);
      }
    });
  }
  
  /**
   * 触摸开始处理
   */
  onTouchStart(pointer) {
    this.currentMode = 'touch';
    
    const now = Date.now();
    const position = { x: pointer.x, y: pointer.y };
    
    // 检测双击
    const timeSinceLastTap = now - this.touchState.lastTapTime;
    const distanceFromLastTap = this.touchState.lastTapPosition
      ? Phaser.Math.Distance.Between(
          position.x, position.y,
          this.touchState.lastTapPosition.x,
          this.touchState.lastTapPosition.y
        )
      : Infinity;
    
    const settings = GameState.inputBindings.touch;
    
    if (timeSinceLastTap < settings.doubleTapDelay && 
        distanceFromLastTap < settings.tapRadius) {
      // 双击
      this.triggerAction('doubleTap');
      this.touchState.lastTapTime = 0;
      this.touchState.lastTapPosition = null;
    } else {
      // 单击/长按
      this.touchState.lastTapTime = now;
      this.touchState.lastTapPosition = position;
      
      // 启动长按计时器
      this.touchState.longPressTimer = setTimeout(() => {
        this.touchState.isLongPress = true;
        this.triggerAction('longPress', position);
      }, settings.longPressDuration);
    }
  }
  
  /**
   * 触摸结束处理
   */
  onTouchEnd(pointer) {
    // 取消长按计时器
    if (this.touchState.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer);
      this.touchState.longPressTimer = null;
    }
    
    // 如果不是长按，触发单击
    if (!this.touchState.isLongPress) {
      this.triggerAction('tap', { x: pointer.x, y: pointer.y });
    }
    
    this.touchState.isLongPress = false;
  }
  
  /**
   * 触发动作
   */
  triggerAction(action, data = null) {
    console.log(`[InputRemap] Action triggered: ${action}`, data);
    
    // 派发自定义事件
    this.scene.events.emit('input:action', action, data);
    
    // 处理标准动作
    switch (action) {
      case 'pause':
        this.scene.togglePause();
        break;
        
      case 'equipmentPanel':
        this.scene.events.emit('ui:toggleEquipmentPanel');
        break;
        
      case 'achievementPanel':
        this.scene.events.emit('ui:toggleAchievementPanel');
        break;
        
      case 'leaderboardPanel':
        this.scene.events.emit('ui:toggleLeaderboardPanel');
        break;
        
      case 'menuToggle':
        this.scene.events.emit('ui:toggleMenu');
        break;
        
      default:
        // 其他动作由各系统自行处理
        break;
    }
  }
  
  /**
   * 重新映射按键
   */
  remapKey(mode, action, newKey) {
    if (!GameState.inputBindings[mode]) {
      console.error(`[InputRemap] Invalid mode: ${mode}`);
      return false;
    }
    
    if (!GameState.inputBindings[mode].hasOwnProperty(action)) {
      console.error(`[InputRemap] Invalid action: ${action}`);
      return false;
    }
    
    // 检查冲突
    const existingAction = Object.keys(GameState.inputBindings[mode]).find(a => {
      return a !== action && GameState.inputBindings[mode][a] === newKey;
    });
    
    if (existingAction) {
      console.warn(`[InputRemap] Key ${newKey} is already bound to ${existingAction}`);
      return false;
    }
    
    // 更新绑定
    GameState.inputBindings[mode][action] = newKey;
    
    console.log(`[InputRemap] Remapped ${mode}.${action} to ${newKey}`);
    return true;
  }
  
  /**
   * 重置为默认绑定
   */
  resetToDefault(mode = null) {
    if (mode) {
      GameState.inputBindings[mode] = JSON.parse(JSON.stringify(this.defaultBindings[mode]));
    } else {
      GameState.inputBindings = JSON.parse(JSON.stringify(this.defaultBindings));
    }
    
    console.log('[InputRemap] Reset to default bindings');
  }
  
  /**
   * 获取当前输入模式
   */
  getCurrentMode() {
    return this.currentMode;
  }
  
  /**
   * 获取按键绑定
   */
  getBindings(mode = null) {
    if (mode) {
      return GameState.inputBindings[mode] || {};
    }
    return GameState.inputBindings;
  }
  
  /**
   * 获取动作对应的按键
   */
  getKeyForAction(action, mode = null) {
    const targetMode = mode || this.currentMode;
    return GameState.inputBindings[targetMode]?.[action] || null;
  }
  
  /**
   * 检测输入模式变化
   */
  update() {
    // 自动检测手柄连接
    if (this.scene.input.gamepad && this.scene.input.gamepad.total > 0) {
      const pad = this.scene.input.gamepad.getPad(0);
      if (pad && pad.buttons.some(b => b.pressed)) {
        this.currentMode = 'gamepad';
      }
    }
  }
  
  /**
   * 导出配置
   */
  exportConfig() {
    return JSON.stringify(GameState.inputBindings, null, 2);
  }
  
  /**
   * 导入配置
   */
  importConfig(jsonString) {
    try {
      const config = JSON.parse(jsonString);
      
      // 验证配置结构
      if (!config.keyboard || !config.gamepad || !config.touch) {
        throw new Error('Invalid config structure');
      }
      
      GameState.inputBindings = config;
      console.log('[InputRemap] Config imported successfully');
      return true;
    } catch (error) {
      console.error('[InputRemap] Failed to import config:', error);
      return false;
    }
  }
}
