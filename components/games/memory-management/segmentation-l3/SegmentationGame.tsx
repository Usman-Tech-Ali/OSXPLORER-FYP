'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { SegmentationGameL3 } from './game';

export default function CarnivalSegmentationGameL3() {
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
        backgroundColor: '#1a2e1a',
        parent: 'seg-game-container',
        scene: SegmentationGameL3,
      });

      // focus canvas so keyboard input works immediately
      setTimeout(() => {
        const canvas = document.querySelector('#seg-game-container canvas');
        if (canvas instanceof HTMLCanvasElement) {
          canvas.setAttribute('tabindex', '0');
          canvas.focus();
        }
      }, 500);

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
      id="seg-game-container"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a2e1a',
        overflow: 'hidden',
      }}
    />
  );
}

// named export for barrel import consistency with L1 game
export { CarnivalSegmentationGameL3 };