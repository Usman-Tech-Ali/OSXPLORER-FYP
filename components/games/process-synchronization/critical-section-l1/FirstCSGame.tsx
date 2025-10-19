'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { CriticalSectionGameConfig } from './game';

export default function FirstCSGame() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !gameRef.current) {
      const width = window.innerWidth;
      const height = window.innerHeight;

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        scale: {
          mode: Phaser.Scale.ENVELOP,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width,
          height,
        },
        backgroundColor: '#181c24',
        parent: 'cs-game-container',
        scene: CriticalSectionGameConfig.scene,
      });

      // Handle resizing dynamically
      const handleResize = () => {
        if (gameRef.current) {
          gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
        }
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        gameRef.current?.destroy(true);
        gameRef.current = null;
      };
    }
  }, []);

  return (
    <div
      id="cs-game-container"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#181c24',
        overflow: 'hidden',
      }}
    />
  );
}