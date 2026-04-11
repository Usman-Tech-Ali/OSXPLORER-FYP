import Phaser from 'phaser';
import { openAIFeedbackChat } from '../../shared/aiFeedbackChat';

const ASSET_PATH = '/games/memory-management/paging/';

export type GadgetType = 'drill' | 'laser' | 'card' | 'computer';

interface GateConfig {
  x: number;
  y: number;
  required: GadgetType;
  label: string;
  passed: boolean;
  sprite?: Phaser.GameObjects.Sprite;
  bubble?: Phaser.GameObjects.Text;
}

const BELT_SLOTS = 3;
const GADGET_KEYS: Record<GadgetType, string> = {
  drill: 'gadget-drill',
  laser: 'gadget-laser',
  card: 'gadget-card',
  computer: 'gadget-computer',
};

export class PagingL2Game extends Phaser.Scene {
  private gamePhase: 'intro' | 'playing' | 'results' = 'intro';
  private thief!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: { w: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key } | null = null;
  private speed = 200;
  private belt: (GadgetType | null)[] = [null, null, null];
  private vanInventory: GadgetType[] = ['drill', 'laser', 'card', 'computer'];
  private gates: GateConfig[] = [];
  private gateSprites: Phaser.GameObjects.Sprite[] = [];
  private beltSlots: Phaser.GameObjects.Container[] = [];
  private instructionText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private pageFaults = 0;
  private vanSprite!: Phaser.GameObjects.Sprite;
  private vanZone!: Phaser.Geom.Rectangle;
  private gateZones: Phaser.Geom.Rectangle[] = [];
  private runningFrames = ['thief-running-1', 'thief-running-2'];
  private lastGateAttempt = 0;
  private showPickupMenu = false;
  private keyE?: Phaser.Input.Keyboard.Key;
  private controlsHintText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'PagingL2Game' });
  }

  preload() {
    const p = ASSET_PATH;
    this.load.image('museum-bg', `${p}Museum-Background.png`);
    this.load.image('van', `${p}Getaway-Van.png`);
    this.load.image('thief-standing', `${p}Thief-Standing.png`);
    this.load.image('thief-running-1', `${p}Thief-Running-1.png`);
    this.load.image('thief-running-2', `${p}Thief-Running-2.png`);
    this.load.image('gate-active', `${p}Active-Gate.png`);
    this.load.image('gate-deactive', `${p}Deactive-Gate.png`);
    this.load.image('belt-empty', `${p}Utility-Belt-Empty.png`);
    this.load.image('belt-selected', `${p}Utility-Belt-Item-Selected.png`);
    this.load.image('gadget-drill', `${p}Drill.png`);
    this.load.image('gadget-laser', `${p}Laser.png`);
    this.load.image('gadget-card', `${p}Card.png`);
    this.load.image('gadget-computer', `${p}Computer.png`);
    this.load.image('completed', `${p}Completed.png`);
    this.load.image('danger', `${p}Danger.png`);
  }

  create() {
    const { width, height } = this.cameras.main;
    const bg = this.add.image(width / 2, height / 2, 'museum-bg');
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale).setDepth(-100);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      w: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    const vanX = width * 0.5;
    const vanY = height * 0.88;
    this.vanSprite = this.add.sprite(vanX, vanY, 'van').setScale(0.35).setDepth(5);
    this.vanSprite.setInteractive({ useHandCursor: true });
    this.vanSprite.on('pointerdown', () => {
      if (this.gamePhase === 'playing' && this.atVan() && !this.showPickupMenu) this.openVanMenu();
    });
    this.vanZone = new Phaser.Geom.Rectangle(vanX - 100, vanY - 100, 200, 140);
    this.keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    const startX = vanX - 60;
    const startY = vanY - 80;
    this.thief = this.add.sprite(startX, startY, 'thief-standing').setScale(0.4).setDepth(10);

    // L2: Locality – 3 gates in a row all requiring Laser (high hit ratio if you keep Laser in belt)
    this.gates = [
      { x: width * 0.4, y: height * 0.45, required: 'laser', label: 'Laser', passed: false },
      { x: width * 0.5, y: height * 0.45, required: 'laser', label: 'Laser', passed: false },
      { x: width * 0.6, y: height * 0.45, required: 'laser', label: 'Laser', passed: false },
    ];
    this.gates.forEach((g, i) => {
      const spr = this.add.sprite(g.x, g.y, 'gate-active').setScale(0.4).setDepth(4);
      g.sprite = spr;
      this.gateSprites.push(spr);
      const bubble = this.add.text(g.x, g.y - 55, g.label, {
        fontSize: '14px', color: '#fff', backgroundColor: '#333', padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setDepth(6);
      g.bubble = bubble;
      this.gateZones.push(new Phaser.Geom.Rectangle(g.x - 45, g.y - 50, 90, 100));
    });

    this.createBeltUI(width, height);
    this.phaseText = this.add.text(width / 2, 24, 'Phase: Intro', {
      fontSize: '18px', color: '#00FF00', fontStyle: 'bold', backgroundColor: '#000000AA', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(20);
    this.instructionText = this.add.text(width / 2, height - 28, 'Heist Protocol L2: Locality. Keep the right gadget in your belt!', {
      fontSize: '14px', color: '#fff', backgroundColor: '#000000CC', padding: { x: 12, y: 6 }, align: 'center',
    }).setOrigin(0.5).setDepth(20);
    this.controlsHintText = this.add.text(width / 2, 52, 'WASD or Arrows = MOVE   |   Stand on VAN then Press E or CLICK van = GET GADGETS   |   Walk into gate = OPEN', {
      fontSize: '13px', color: '#B0E0E6', backgroundColor: '#00000099', padding: { x: 14, y: 6 }, align: 'center',
    }).setOrigin(0.5).setDepth(20).setVisible(false);

    this.showIntro(width, height);
  }

  private createBeltUI(width: number, height: number) {
    const beltY = height - 62;
    const slotW = 52;
    const startX = width / 2 - (BELT_SLOTS * slotW) / 2 + slotW / 2;
    for (let i = 0; i < BELT_SLOTS; i++) {
      const x = startX + i * slotW;
      const container = this.add.container(x, beltY);
      const bg = this.add.sprite(0, 0, 'belt-empty').setScale(0.14);
      container.add(bg);
      container.setDepth(15);
      this.beltSlots.push(container);
    }
    this.refreshBeltDisplay();
  }

  private refreshBeltDisplay() {
    this.beltSlots.forEach((container, i) => {
      const existing = container.list.filter((o: any) => o instanceof Phaser.GameObjects.Sprite && o.texture?.key?.startsWith('gadget-'));
      existing.forEach((o: any) => o.destroy());
      const g = this.belt[i];
      if (g) {
        const icon = this.add.sprite(0, 0, GADGET_KEYS[g]).setScale(0.16);
        container.add(icon);
      }
    });
  }

  private showIntro(width: number, height: number) {
    const overlay = this.add.graphics().fillStyle(0x000000, 0.8).fillRect(0, 0, width, height).setDepth(30);
    const title = this.add.text(width / 2, height * 0.35, 'Heist Protocol – Level 2', {
      fontSize: '28px', color: '#FFD700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);
    const sub = this.add.text(width / 2, height * 0.45, 'The Pro: Locality of Reference', {
      fontSize: '18px', color: '#fff',
    }).setOrigin(0.5).setDepth(31);
    const body = this.add.text(width / 2, height * 0.55,
      'These 3 gates all need the LASER. If you keep the Laser in your belt,\nyou can open all three without going back to the van (high hit ratio!).',
      { fontSize: '14px', color: '#E0E0E0', align: 'center' }
    ).setOrigin(0.5).setDepth(31);
    const btn = this.add.text(width / 2, height * 0.72, 'START', {
      fontSize: '22px', color: '#000', backgroundColor: '#FFD700', padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(31);
    btn.on('pointerdown', () => {
      [overlay, title, sub, body, btn].forEach(o => o.destroy());
      this.gamePhase = 'playing';
      this.phaseText.setText('Phase: Playing (Locality)');
      this.instructionText.setText('1) Move to the VAN (bottom) with WASD/Arrows  2) Press E, pick Laser  3) Walk into each of the 3 gates to open them.');
      if (this.controlsHintText) this.controlsHintText.setVisible(true);
    });
  }

  private hasGadget(g: GadgetType): boolean {
    return this.belt.includes(g);
  }

  private tryOpenGate(gate: GateConfig) {
    if (gate.passed) return;
    const hasIt = this.hasGadget(gate.required);
    if (hasIt) {
      gate.passed = true;
      gate.sprite!.setTexture('gate-deactive');
      gate.bubble!.setText('Open!');
      const check = this.add.sprite(gate.x, gate.y - 70, 'completed').setScale(0.35).setDepth(12);
      this.time.delayedCall(800, () => check.destroy());
      const allPassed = this.gates.every(g => g.passed);
      if (allPassed) this.win();
    } else {
      this.pageFaults++;
      const danger = this.add.sprite(gate.x, gate.y - 70, 'danger').setScale(0.35).setDepth(12);
      this.time.delayedCall(800, () => danger.destroy());
      this.instructionText.setText('Page fault! Get the Laser from the van.');
    }
  }

  private win() {
    this.gamePhase = 'results';
    const { width, height } = this.cameras.main;
    this.phaseText.setText('Phase: Complete!');
    this.instructionText.setText('All gates open! Page faults: ' + this.pageFaults + ' (fewer is better – locality!)');
    this.submitScore();

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.82);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(28);

    const boxWidth = 640;
    const boxHeight = 400;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const resultsBox = this.add.graphics();
    resultsBox.fillStyle(0x0a0e27, 0.98);
    resultsBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    resultsBox.lineStyle(4, 0x00ffcc, 1);
    resultsBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    resultsBox.setDepth(29);

    this.add.text(width / 2, boxY + 42, '🎉 GAME COMPLETE!', {
      fontSize: '32px',
      color: '#00FFCC',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(30);

    this.add.text(width / 2, boxY + 140, `Page Faults: ${this.pageFaults}\nGates Opened: ${this.gates.filter(g => g.passed).length}/${this.gates.length}`, {
      fontSize: '22px',
      color: '#FFFFFF',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5).setDepth(30);

    const aiButton = this.add.text(width / 2 - 210, boxY + 310, '💬 Chat with AI', {
      fontSize: '18px',
      color: '#FFFFFF',
      backgroundColor: '#4CAF50',
      padding: { x: 14, y: 10 },
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(30);

    aiButton.on('pointerdown', () => {
      openAIFeedbackChat({
        gameType: this.scene.key,
        score: Math.max(0, 100 - this.pageFaults * 10),
        wrongAttempts: this.pageFaults,
        phase: this.gamePhase,
      });
    });

    const miniQuestButton = this.add.text(width / 2, boxY + 310, 'Mini-Quest', {
      fontSize: '18px',
      color: '#000000',
      backgroundColor: '#00E5FF',
      padding: { x: 18, y: 10 },
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(30);

    miniQuestButton.on('pointerdown', () => {
      window.location.assign('/modules/memory-management/mini-quest/paging');
    });

    const replayButton = this.add.text(width / 2 + 210, boxY + 310, 'Play Again', {
      fontSize: '18px',
      color: '#FFFFFF',
      backgroundColor: '#4CAF50',
      padding: { x: 18, y: 10 },
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(30);

    replayButton.on('pointerdown', () => this.scene.restart());
  }

  private async submitScore() {
    try {
      await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: 'paging-l2',
          moduleId: 'memory-management',
          levelId: 'l2',
          score: Math.max(0, 100 - this.pageFaults * 10),
          timeSpent: 1,
          accuracy: Math.max(0, 100 - this.pageFaults * 10),
          wrongAttempts: this.pageFaults,
          metadata: {
            pageFaults: this.pageFaults,
            gatesOpened: this.gates.filter(g => g.passed).length,
            totalGates: this.gates.length,
          },
        }),
      });
    } catch (error) {
      console.error('Failed to submit paging L2 score:', error);
    }
  }

  private atVan(): boolean {
    return Phaser.Geom.Rectangle.Contains(this.vanZone, this.thief.x, this.thief.y);
  }

  private openVanMenu() {
    if (this.showPickupMenu) return;
    this.showPickupMenu = true;
    const { width, height } = this.cameras.main;
    const box = this.add.graphics().fillStyle(0x1a1a2e, 0.95).fillRoundedRect(width * 0.25, height * 0.25, width * 0.5, height * 0.5, 12).setDepth(40);
    const allParts: Phaser.GameObjects.GameObject[] = [box];
    const emptyIdx = this.belt.indexOf(null);

    if (emptyIdx !== -1) {
      const title = this.add.text(width / 2, height * 0.32, 'Van – Pick a gadget', {
        fontSize: '20px', color: '#FFD700', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(41);
      allParts.push(title);
      this.vanInventory.forEach((g, i) => {
        const x = width * 0.35 + (i % 3) * 100;
        const y = height * 0.45 + Math.floor(i / 3) * 90;
        const sprite = this.add.sprite(x, y, GADGET_KEYS[g]).setScale(0.3).setInteractive({ useHandCursor: true }).setDepth(41);
        const label = this.add.text(x, y + 40, g, { fontSize: '12px', color: '#fff' }).setOrigin(0.5).setDepth(41);
        sprite.on('pointerdown', () => this.pickGadgetFromVan(g, allParts));
        allParts.push(sprite, label);
      });
    } else {
      const title = this.add.text(width / 2, height * 0.32, 'Belt full – drop one', {
        fontSize: '20px', color: '#FFA500', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(41);
      allParts.push(title);
      this.belt.forEach((g, i) => {
        if (!g) return;
        const x = width * 0.35 + i * 110;
        const y = height * 0.5;
        const sprite = this.add.sprite(x, y, GADGET_KEYS[g]).setScale(0.28).setInteractive({ useHandCursor: true }).setDepth(41);
        const label = this.add.text(x, y + 45, 'Drop ' + g, { fontSize: '12px', color: '#fff' }).setOrigin(0.5).setDepth(41);
        sprite.on('pointerdown', () => {
          this.belt[i] = null;
          this.refreshBeltDisplay();
          this.showPickupMenu = false;
          allParts.forEach((o: any) => (o as any).destroy?.());
          this.instructionText.setText('Dropped. Press E at van again to pick a gadget.');
        });
        allParts.push(sprite, label);
      });
    }

    const closeBtn = this.add.text(width / 2, height * 0.78, 'Close', {
      fontSize: '16px', color: '#000', backgroundColor: '#888', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(41);
    closeBtn.on('pointerdown', () => {
      this.showPickupMenu = false;
      allParts.forEach((o: any) => (o as any).destroy?.());
      closeBtn.destroy();
    });
    allParts.push(closeBtn);
  }

  private pickGadgetFromVan(gadget: GadgetType, toDestroy: Phaser.GameObjects.GameObject[]) {
    const emptyIdx = this.belt.indexOf(null);
    if (emptyIdx !== -1) {
      this.belt[emptyIdx] = gadget;
      this.refreshBeltDisplay();
      toDestroy.forEach((o: any) => (o as any).destroy?.());
      this.showPickupMenu = false;
      this.instructionText.setText('Picked ' + gadget + '. Open gates that need this gadget.');
    }
  }

  update(_t: number, dt: number) {
    if (this.gamePhase !== 'playing') return;
    const dx = (this.cursors.left.isDown || this.wasd?.a.isDown ? -1 : 0) + (this.cursors.right.isDown || this.wasd?.d.isDown ? 1 : 0);
    const dy = (this.cursors.up.isDown || this.wasd?.w.isDown ? -1 : 0) + (this.cursors.down.isDown || this.wasd?.s.isDown ? 1 : 0);
    if (dx !== 0 || dy !== 0) {
      this.thief.setTexture(this.runningFrames[Math.floor(this.time.now / 200) % 2]);
      this.thief.x += (dx * this.speed * dt) / 1000;
      this.thief.y += (dy * this.speed * dt) / 1000;
    } else {
      this.thief.setTexture('thief-standing');
    }

    if (this.atVan() && !this.showPickupMenu) {
      this.instructionText.setText('At the VAN: Press E or CLICK the van to open inventory.');
      if (this.keyE?.justDown) this.openVanMenu();
    } else {
      this.gateZones.forEach((zone, i) => {
        if (Phaser.Geom.Rectangle.Contains(zone, this.thief.x, this.thief.y)) {
          const gate = this.gates[i];
          if (!gate.passed && this.time.now - this.lastGateAttempt > 500) {
            this.lastGateAttempt = this.time.now;
            this.tryOpenGate(gate);
          }
        }
      });
    }
  }
}
