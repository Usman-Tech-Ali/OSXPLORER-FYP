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
          mode: Phaser.Scale.RESIZE,
          parent: 'cs-game-container',
          width,
          height,
        },
        backgroundColor: '#181c24',
        parent: 'cs-game-container',
        scene: CriticalSectionGameConfig.scene,
        input: {
          mouse: {
            preventDefaultWheel: false,
          },
          touch: {
            capture: true,
          },
        },
      });

      // Ensure canvas styling doesn't interfere with coordinates
      const canvas = gameRef.current.canvas;
      if (canvas) {
        canvas.style.display = 'block';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
      }

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
        background: '#181c24',
        overflow: 'hidden',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    />
  );
}