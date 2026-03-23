'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { CountingSemaphoreL3Scene } from './game';

export default function CountingSemaphoreGameL3() {
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
        backgroundColor: '#0a1628',
        parent: 'game-container',
        scene: CountingSemaphoreL3Scene,
      });

      const handleResize = () => {
        gameRef.current?.scale.resize(window.innerWidth, window.innerHeight);
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
      id="game-container"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a1628',
        overflow: 'hidden',
      }}
    />
  );
}