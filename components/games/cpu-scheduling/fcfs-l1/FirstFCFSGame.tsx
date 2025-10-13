'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { FCFSGame } from './game';

export default function FirstFCFSGame() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !gameRef.current) {
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 1600,
          height: 1000,
          min: {
            width: 1200,
            height: 800
          },
          max: {
            width: 1920,
            height: 1080
          }
        },
        backgroundColor: '#181c24',
        parent: 'game-container',
        scene: FCFSGame,
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
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
        background: '#181c24',
      }}
    />
  );
}
