'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { RoundRobinL3Game } from './game';

export default function FirstRRGame() {
  const gameRef = useRef<Phaser.Game | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined' && !gameRef.current) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, width: w, height: h },
        backgroundColor: '#181c24',
        parent: 'game-container',
        scene: RoundRobinL3Game,
      });
      const onResize = () => gameRef.current?.scale.resize(window.innerWidth, window.innerHeight);
      window.addEventListener('resize', onResize);
      return () => {
        window.removeEventListener('resize', onResize);
        gameRef.current?.destroy(true);
        gameRef.current = null;
      };
    }
  }, []);
  return <div id="game-container" style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#181c24', overflow: 'hidden' }} />;
}
