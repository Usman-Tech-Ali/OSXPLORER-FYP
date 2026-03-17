'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { FragL3Scene } from './game';

// ── Level selector scene ──────────────────────────────────────────────────────

class LevelSelectScene extends Phaser.Scene {
  constructor() { super({ key: 'LevelSelectScene' }); }

  preload() {
    this.load.image('warehouse-bg', '/games/memory-management/compaction/Warehouse-Background.png');
  }

  create() {
    const { width, height } = this.cameras.main;
    const bg = this.add.image(width / 2, height / 2, 'warehouse-bg');
    bg.setScale(Math.max(width / bg.width, height / bg.height)).setDepth(-10);

    this.add.graphics().fillStyle(0x000000, 0.70).fillRect(0, 0, width, height).setDepth(0);

    this.add.text(width / 2, height * 0.14, '🏭  Fragmentation & Compaction', {
      fontSize: '28px', color: '#FFD700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1);

    this.add.text(width / 2, height * 0.23, 'Memory Management — Warehouse Edition', {
      fontSize: '16px', color: '#00FFCC',
    }).setOrigin(0.5).setDepth(1);

    const levels = [
      {
        key: 'FragL3Scene',
        title: 'Level 3: Compaction',
        subtitle: 'CPU Overhead Penalty',
        desc: 'Deliver processes under time pressure.\nPress COMPACT to merge gaps — but it\nfreezes the belt! Too many = GAME OVER.',
        color: '#FF4444',
        y: 0.5,
      },
    ];

    levels.forEach(lvl => {
      const card = this.add.graphics().setDepth(1);
      card.fillStyle(0x0a0a1a, 0.90)
        .fillRoundedRect(width * 0.22, height * (lvl.y - 0.085), width * 0.56, height * 0.14, 10)
        .lineStyle(2, Phaser.Display.Color.HexStringToColor(lvl.color).color, 0.8)
        .strokeRoundedRect(width * 0.22, height * (lvl.y - 0.085), width * 0.56, height * 0.14, 10);

      this.add.text(width * 0.28, height * (lvl.y - 0.05), lvl.title, {
        fontSize: '15px', color: lvl.color, fontStyle: 'bold',
      }).setOrigin(0, 0.5).setDepth(2);

      this.add.text(width * 0.28, height * (lvl.y - 0.01), `[ ${lvl.subtitle} ]`, {
        fontSize: '11px', color: '#888888',
      }).setOrigin(0, 0.5).setDepth(2);

      this.add.text(width * 0.28, height * (lvl.y + 0.035), lvl.desc, {
        fontSize: '11px', color: '#C0C0C0', lineSpacing: 3,
      }).setOrigin(0, 0.5).setDepth(2);

      const btn = this.add.text(width * 0.74, height * lvl.y, 'PLAY ▶', {
        fontSize: '14px', color: '#000', backgroundColor: lvl.color, padding: { x: 14, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(2);

      btn.on('pointerover', () => btn.setAlpha(0.8));
      btn.on('pointerout',  () => btn.setAlpha(1));
      btn.on('pointerdown', () => this.scene.start(lvl.key));
    });

    this.add.text(width / 2, height * 0.92,
      'Learn how operating systems handle memory allocation, fragmentation, and compaction.',
      { fontSize: '11px', color: '#666666', align: 'center' }
    ).setOrigin(0.5).setDepth(1);
  }
}

// ── React component ───────────────────────────────────────────────────────────

interface Props {
  /** 'l1' | 'l2' | 'l3' | undefined (shows level select) */
  level?: 'l1' | 'l2' | 'l3';
}

export default function FragmentationGame({ level }: Props = {}) {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !gameRef.current) {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // pick start scene
      const startScene = 'FragL3Scene';

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, width: w, height: h },
        backgroundColor: '#1a1a2e',
        parent: 'frag-game-container',
        scene: [LevelSelectScene, FragL3Scene],
      });

      // jump straight into Level 3 after boot
      gameRef.current.events.once('ready', () => {
        gameRef.current?.scene.stop('LevelSelectScene');
        gameRef.current?.scene.start(startScene);
      });

      setTimeout(() => {
        const canvas = document.querySelector('#frag-game-container canvas');
        if (canvas instanceof HTMLCanvasElement) { canvas.setAttribute('tabindex', '0'); canvas.focus(); }
      }, 500);

      const onResize = () => gameRef.current?.scale.resize(window.innerWidth, window.innerHeight);
      window.addEventListener('resize', onResize);
      return () => {
        window.removeEventListener('resize', onResize);
        gameRef.current?.destroy(true);
        gameRef.current = null;
      };
    }
  }, []);

  return (
    <div
      id="frag-game-container"
      style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#1a1a2e', overflow: 'hidden' }}
    />
  );
}

// named exports for direct level routing
export { FragmentationGame };
export function FragmentationGameL1() { return <FragmentationGame level="l1" />; }
export function FragmentationGameL2() { return <FragmentationGame level="l2" />; }
export function FragmentationGameL3() { return <FragmentationGame level="l3" />; }