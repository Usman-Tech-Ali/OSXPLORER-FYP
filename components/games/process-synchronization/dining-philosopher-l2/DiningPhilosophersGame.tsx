'use client';
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { DiningPhilosophersL2Scene } from './game';

export default function DiningPhilosophersGameL2() {
  const gameRef = useRef<Phaser.Game | null>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && !gameRef.current) {
      try {
        gameRef.current = new Phaser.Game({
          type: Phaser.AUTO,
          scale: { 
            mode: Phaser.Scale.ENVELOP, 
            autoCenter: Phaser.Scale.CENTER_BOTH, 
            width: window.innerWidth, 
            height: window.innerHeight 
          },
          backgroundColor: '#080c10',
          parent: 'game-container',
          scene: [DiningPhilosophersL2Scene],
          physics: { default: 'arcade', arcade: { debug: false } },
        });
        
        const handleResize = () => {
          if (gameRef.current) {
            gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
          }
        };
        
        window.addEventListener('resize', handleResize);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          if (gameRef.current) {
            gameRef.current.destroy(true);
            gameRef.current = null;
          }
        };
      } catch (error) {
        console.error('Failed to initialize Phaser game:', error);
      }
    }
  }, []);
  
  return <div id="game-container" style={{ width: '100vw', height: '100vh', background: '#080c10', overflow: 'hidden' }} />;
}