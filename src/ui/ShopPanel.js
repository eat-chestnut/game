import { UIFactory } from './UIFactory.js';
import { ThemeTokens, themeColor } from '../theme.js';
import { GameState } from '../state/GameState.js';
import { ShopSystem } from '../systems/ShopSystem.js';
import { SaveManager } from '../state/SaveManager.js';

/**
 * ShopPanel - 商店面板 UI
 * 显示可购买的永久升级项
 */
export class ShopPanel {
  constructor(scene) {
    this.scene = scene;
    this.uiFactory = new UIFactory(scene);
    this.shopSystem = new ShopSystem();
    this.shopSystem.loadShop();
    this.container = null;
    this.isOpen = false;
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;

    const overlay = this.scene.add.rectangle(360, 800, 720, 1600, 0x000000, 0.7);
    overlay.setDepth(450);
    overlay.setInteractive();

    const panel = this.uiFactory.createPanel(680, 1200, 'panelStrong');
    panel.setDepth(460);

    const title = this.scene.add.text(0, -540, '永久商店', {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '32px',
      fontWeight: '700',
      color: ThemeTokens.color.text
    }).setOrigin(0.5);

    const coinsText = this.scene.add.text(0, -480, `金币：${GameState.globals.coins}`, {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '22px',
      color: ThemeTokens.color.accent
    }).setOrigin(0.5);

    const items = this.shopSystem.getShopItems();
    const itemCards = items.map((item, index) => this.createItemCard(item, index));

    const btnClose = this.uiFactory.createButton('关闭', { width: 280, height: 56, variant: 'accent' });
    btnClose.setPosition(0, 540);
    btnClose.on('pointerup', () => this.close());

    const content = this.scene.add.container(360, 800, [
      panel,
      title,
      coinsText,
      ...itemCards,
      btnClose
    ]);
    content.setDepth(460);

    this.container = this.scene.add.container(0, 0, [overlay, content]);
    this.coinsText = coinsText;
  }

  createItemCard(item, index) {
    const offsetY = -360 + index * 260;
    const width = 620;
    const height = 220;

    const bg = this.scene.add.rectangle(0, 0, width, height, 0xffffff, item.available ? 0.08 : 0.03);
    bg.setOrigin(0.5);
    bg.setStrokeStyle(2, themeColor(item.available ? ThemeTokens.color.primary : ThemeTokens.color.textMuted), item.available ? 0.6 : 0.3);

    const name = this.scene.add.text(-width / 2 + 20, -height / 2 + 24, item.name, {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '24px',
      fontWeight: '700',
      color: item.available ? ThemeTokens.color.text : ThemeTokens.color.textMuted
    }).setOrigin(0, 0);

    const desc = this.scene.add.text(-width / 2 + 20, -height / 2 + 60, item.description, {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '16px',
      color: ThemeTokens.color.textMuted,
      wordWrap: { width: width - 40 }
    }).setOrigin(0, 0);

    const level = this.scene.add.text(-width / 2 + 20, height / 2 - 30, `等级：${item.level}/${item.maxLevel}`, {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '18px',
      color: ThemeTokens.color.accent
    }).setOrigin(0, 1);

    const cost = this.scene.add.text(width / 2 - 20, height / 2 - 30, `${item.cost} 金币`, {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '18px',
      fontWeight: '700',
      color: item.available ? ThemeTokens.color.success : ThemeTokens.color.textMuted
    }).setOrigin(1, 1);

    const container = this.scene.add.container(0, offsetY, [bg, name, desc, level, cost]);
    container.setSize(width, height);

    if (item.available) {
      container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
      container.on('pointerdown', () => {
        this.buyItem(item.id);
      });
      container.on('pointerover', () => {
        bg.setFillStyle(0xffffff, 0.12);
      });
      container.on('pointerout', () => {
        bg.setFillStyle(0xffffff, 0.08);
      });
    }

    return container;
  }

  buyItem(itemId) {
    const success = this.shopSystem.buy(itemId);
    if (success) {
      SaveManager.save({ coins: GameState.globals.coins });
      this.refresh();
      this.showFeedback('购买成功！重新开局生效', 'success');
    } else {
      this.showFeedback('金币不足或已达上限', 'error');
    }
  }

  refresh() {
    if (!this.isOpen) return;
    this.close();
    this.open();
  }

  showFeedback(msg, type) {
    const color = type === 'success' ? ThemeTokens.color.success : ThemeTokens.color.danger;
    const text = this.scene.add.text(360, 1400, msg, {
      fontFamily: ThemeTokens.typography.fontFamily,
      fontSize: '20px',
      color,
      align: 'center'
    }).setOrigin(0.5).setDepth(470);

    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      y: 1350,
      duration: 1500,
      onComplete: () => text.destroy()
    });
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (this.container) {
      this.container.destroy(true);
      this.container = null;
    }
  }
}
