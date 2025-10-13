import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { FirstFitGameConfig } from './game';

export default function FirstFitGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current && !phaserGameRef.current) {
      const config = {
        ...FirstFitGameConfig,
        parent: gameRef.current,
        scale: {
          mode: Phaser.Scale.RESIZE,
          parent: gameRef.current,
          width: '100%',
          height: '100%',
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      };
      
      phaserGameRef.current = new Phaser.Game(config);
    }
    
    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={gameRef}
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0f0f23',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 10
      }}
    />
  );
}
