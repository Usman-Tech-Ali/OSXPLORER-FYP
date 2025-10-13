import Phaser from 'phaser';

// ===== SOUND EFFECTS (Simple Audio Context) =====
function playSuccessSound() {
  if (typeof window !== 'undefined' && window.AudioContext) {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      // Fallback: no sound if AudioContext fails
    }
  }
}

function playErrorSound() {
  if (typeof window !== 'undefined' && window.AudioContext) {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // A3
      oscillator.type = 'sawtooth';
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      // Fallback: no sound if AudioContext fails
    }
  }
}

export const FirstFitGameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: '100%',
  height: '100%',
  backgroundColor: '#0f0f23',
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: 'phaser-game',
    width: '100%',
    height: '100%',
  },
  scene: {
    preload,
    create,
    update,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
};

// ===== GAME CONSTANTS =====
const GAME_CONFIG = {
  RAM_TOTAL_SIZE: 512, // Total RAM in MB
  RAM_BLOCK_WIDTH: 150,
  RAM_BLOCK_MIN_HEIGHT: 40,
  PROCESS_BLOCK_WIDTH: 140,
  PROCESS_BLOCK_HEIGHT: 50,
  ANIMATION_DURATION: 300,
  SUCCESS_FLASH_DURATION: 500,
};

const COLORS = {
  RAM_BACKGROUND: 0x1a1a2e,
  RAM_BORDER: 0x16213e,
  RAM_USED: 0x4a90e2,
  RAM_FREE: 0x2d3748,
  RAM_HOVER: 0x805ad5,
  PROCESS_COLORS: [0xe53e3e, 0x38a169, 0xd69e2e, 0x3182ce, 0x805ad5, 0xdd6b20],
  SUCCESS: 0x38a169,
  ERROR: 0xe53e3e,
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#a0aec0',
  UI_BACKGROUND: 0x2d3748,
};

// ===== GAME STATE =====
interface MemoryBlock {
  start: number;
  size: number;
  isOccupied: boolean;
  processId?: string;
  color?: number;
  graphics: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
}

interface Process {
  id: string;
  name: string;
  size: number;
  color: number;
  graphics?: Phaser.GameObjects.Graphics;
  label?: Phaser.GameObjects.Text;
  allocated: boolean;
}

let gameState = {
  memoryBlocks: [] as MemoryBlock[],
  processQueue: [] as Process[],
  currentProcessIndex: 0,
  score: 0,
  level: 1,
  allocatedProcesses: 0,
  gamePhase: 'playing', // 'playing', 'completed', 'failed'
};

let gameObjects = {
  ramContainer: null as Phaser.GameObjects.Container | null,
  queueContainer: null as Phaser.GameObjects.Container | null,
  uiContainer: null as Phaser.GameObjects.Container | null,
  draggedProcess: null as { graphics: Phaser.GameObjects.Graphics, label: Phaser.GameObjects.Text } | null,
  hoverBlock: null as MemoryBlock | null,
  feedbackText: null as Phaser.GameObjects.Text | null,
  scoreText: null as Phaser.GameObjects.Text | null,
  instructionText: null as Phaser.GameObjects.Text | null,
  completionPanel: null as Phaser.GameObjects.Container | null,
};

let scene: Phaser.Scene;

// ===== PRELOAD FUNCTION =====
function preload(this: Phaser.Scene) {
  // No external assets needed - using graphics primitives
}

// ===== MAIN CREATE FUNCTION =====
function create(this: Phaser.Scene) {
  scene = this;
  
  // Initialize game state
  initializeGame();
  
  // Create UI layout
  createGameUI();
  
  // Create RAM visualization
  createRAMVisualization();
  
  // Create process queue
  createProcessQueue();
  
  // Add drag and drop functionality
  setupDragAndDrop();
  
  // Create instruction overlay
  createInstructions();
}

// ===== GAME INITIALIZATION =====
function initializeGame() {
  // Reset game state
  gameState = {
    memoryBlocks: [],
    processQueue: [],
    currentProcessIndex: 0,
    score: 0,
    level: 1,
    allocatedProcesses: 0,
    gamePhase: 'playing',
  };

  // Create initial RAM blocks (some pre-allocated, some free)
  const initialBlocks = [
    { start: 0, size: 64, isOccupied: true, processId: 'OS', color: COLORS.RAM_USED },
    { start: 64, size: 96, isOccupied: false },
    { start: 160, size: 48, isOccupied: true, processId: 'P0', color: COLORS.PROCESS_COLORS[0] },
    { start: 208, size: 80, isOccupied: false },
    { start: 288, size: 32, isOccupied: true, processId: 'P1', color: COLORS.PROCESS_COLORS[1] },
    { start: 320, size: 192, isOccupied: false },
  ];

  initialBlocks.forEach(block => {
    const memBlock: MemoryBlock = {
      start: block.start,
      size: block.size,
      isOccupied: block.isOccupied,
      processId: block.processId,
      color: block.color || COLORS.RAM_FREE,
      graphics: null as any,
      label: null as any,
    };
    gameState.memoryBlocks.push(memBlock);
  });

  // Create process queue
  const processes = [
    { id: 'P2', name: 'Process P2', size: 72, color: COLORS.PROCESS_COLORS[2] },
    { id: 'P3', name: 'Process P3', size: 45, color: COLORS.PROCESS_COLORS[3] },
    { id: 'P4', name: 'Process P4', size: 128, color: COLORS.PROCESS_COLORS[4] },
    { id: 'P5', name: 'Process P5', size: 36, color: COLORS.PROCESS_COLORS[5] },
  ];

  processes.forEach(proc => {
    gameState.processQueue.push({
      id: proc.id,
      name: proc.name,
      size: proc.size,
      color: proc.color,
      allocated: false,
    });
  });
}

// ===== UI CREATION =====
function createGameUI() {
  const width = scene.scale.width;
  const height = scene.scale.height;

  // Main title
  scene.add.text(width / 2, 40, 'Memory Stackers: First Fit', {
    fontSize: '28px',
    color: COLORS.TEXT_PRIMARY,
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'bold',
  }).setOrigin(0.5);

  // Subtitle
  scene.add.text(width / 2, 75, 'Basic Allocation Strategy', {
    fontSize: '16px',
    color: COLORS.TEXT_SECONDARY,
    fontFamily: 'Arial, sans-serif',
  }).setOrigin(0.5);

  // Score display
  gameObjects.scoreText = scene.add.text(50, 50, 'Score: 0', {
    fontSize: '18px',
    color: COLORS.TEXT_PRIMARY,
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'bold',
  });

  // Feedback area
  gameObjects.feedbackText = scene.add.text(width / 2, height - 60, '', {
    fontSize: '16px',
    color: COLORS.TEXT_PRIMARY,
    fontFamily: 'Arial, sans-serif',
    align: 'center',
    wordWrap: { width: width * 0.8 },
  }).setOrigin(0.5);
}

// ===== RAM VISUALIZATION =====
function createRAMVisualization() {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const ramHeight = height * 0.7;
  const ramX = width * 0.1;
  const ramY = height * 0.15;

  // RAM container background
  const ramBg = scene.add.graphics();
  ramBg.fillStyle(COLORS.RAM_BACKGROUND, 1);
  ramBg.lineStyle(3, COLORS.RAM_BORDER, 1);
  ramBg.fillRoundedRect(ramX, ramY, GAME_CONFIG.RAM_BLOCK_WIDTH + 20, ramHeight, 10);
  ramBg.strokeRoundedRect(ramX, ramY, GAME_CONFIG.RAM_BLOCK_WIDTH + 20, ramHeight, 10);

  // RAM label
  scene.add.text(ramX + (GAME_CONFIG.RAM_BLOCK_WIDTH + 20) / 2, ramY - 15, `RAM (${GAME_CONFIG.RAM_TOTAL_SIZE}MB)`, {
    fontSize: '16px',
    color: COLORS.TEXT_PRIMARY,
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'bold',
  }).setOrigin(0.5);

  // Create visual blocks for each memory segment
  let currentY = ramY + 10;
  gameState.memoryBlocks.forEach((block, index) => {
    const blockHeight = Math.max((block.size / GAME_CONFIG.RAM_TOTAL_SIZE) * (ramHeight - 20), GAME_CONFIG.RAM_BLOCK_MIN_HEIGHT);
    
    // Create block graphics - Position the graphics object, then draw at (0,0)
    block.graphics = scene.add.graphics();
    block.graphics.x = ramX + 10;
    block.graphics.y = currentY;
    
    block.graphics.fillStyle(block.color || COLORS.RAM_FREE, block.isOccupied ? 0.8 : 0.3);
    block.graphics.lineStyle(2, 0xffffff, block.isOccupied ? 0.8 : 0.4);
    block.graphics.fillRoundedRect(0, 0, GAME_CONFIG.RAM_BLOCK_WIDTH, blockHeight, 5);
    block.graphics.strokeRoundedRect(0, 0, GAME_CONFIG.RAM_BLOCK_WIDTH, blockHeight, 5);

    // Make free blocks interactive for drop zones
    if (!block.isOccupied) {
      block.graphics.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, GAME_CONFIG.RAM_BLOCK_WIDTH, blockHeight),
        Phaser.Geom.Rectangle.Contains
      );
      block.graphics.setData('memoryBlock', block);
      block.graphics.setData('blockIndex', index);
    }

    // Create block label
    const labelText = block.isOccupied ?
      `${block.processId}\n${block.size}MB` :
      `Free\n${block.size}MB`;
    
    block.label = scene.add.text(
      ramX + 10 + GAME_CONFIG.RAM_BLOCK_WIDTH / 2,
      currentY + blockHeight / 2,
      labelText, {
      fontSize: '12px',
      color: block.isOccupied ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY,
      fontFamily: 'Arial, sans-serif',
      align: 'center',
    }).setOrigin(0.5);

    currentY += blockHeight + 5;
  });
}

// ===== PROCESS QUEUE =====
function createProcessQueue() {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const queueX = width * 0.7;
  const queueStartY = height * 0.25;

  // Queue title
  scene.add.text(queueX, queueStartY - 60, 'Process Queue', {
    fontSize: '18px',
    color: COLORS.TEXT_PRIMARY,
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'bold',
  }).setOrigin(0.5);

  // Queue instruction
  scene.add.text(queueX, queueStartY - 35, 'Drag processes to RAM blocks\n(First available fit only!)', {
    fontSize: '14px',
    color: COLORS.TEXT_SECONDARY,
    fontFamily: 'Arial, sans-serif',
    align: 'center',
  }).setOrigin(0.5);

  // Create process blocks
  gameState.processQueue.forEach((process, index) => {
    const yPos = queueStartY + index * (GAME_CONFIG.PROCESS_BLOCK_HEIGHT + 15);
    
    // Process graphics - Position the graphics object, then draw at (0,0)
    process.graphics = scene.add.graphics();
    process.graphics.x = queueX - GAME_CONFIG.PROCESS_BLOCK_WIDTH / 2;
    process.graphics.y = yPos;
    
    process.graphics.fillStyle(process.color, 0.9);
    process.graphics.lineStyle(2, 0xffffff, 1);
    process.graphics.fillRoundedRect(
      0, 0,  // Draw at (0,0) relative to graphics object
      GAME_CONFIG.PROCESS_BLOCK_WIDTH,
      GAME_CONFIG.PROCESS_BLOCK_HEIGHT,
      8
    );
    process.graphics.strokeRoundedRect(
      0, 0,  // Draw at (0,0) relative to graphics object
      GAME_CONFIG.PROCESS_BLOCK_WIDTH,
      GAME_CONFIG.PROCESS_BLOCK_HEIGHT,
      8
    );

    // Process label - Position absolutely
    process.label = scene.add.text(queueX, yPos + GAME_CONFIG.PROCESS_BLOCK_HEIGHT / 2, `${process.name}\n${process.size}MB`, {
      fontSize: '12px',
      color: COLORS.TEXT_PRIMARY,
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Make draggable only if it's the next process in queue
    if (index === gameState.currentProcessIndex) {
      makeProcessDraggable(process);
    } else {
      // Dim non-current processes
      process.graphics!.setAlpha(0.5);
      process.label!.setAlpha(0.5);
    }
  });
}

// ===== DRAG AND DROP FUNCTIONALITY =====
function makeProcessDraggable(process: Process) {
  if (!process.graphics || !process.label || !scene.input) return;

  console.log('Making process draggable:', process.id);

  try {
    // Set up interactive area with proper relative coordinates
    process.graphics.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, GAME_CONFIG.PROCESS_BLOCK_WIDTH, GAME_CONFIG.PROCESS_BLOCK_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );
    
    // Enable dragging after setting interactive
    scene.input.setDraggable(process.graphics);
    
    // Set up pointer events directly on the graphics
    process.graphics.on('pointerover', () => {
      process.graphics!.setAlpha(0.9);
      scene.sys.canvas.style.cursor = 'pointer';
    });
    
    process.graphics.on('pointerout', () => {
      if (!gameObjects.draggedProcess || gameObjects.draggedProcess.graphics !== process.graphics) {
        process.graphics!.setAlpha(1);
      }
      scene.sys.canvas.style.cursor = 'default';
    });
    
    process.graphics.on('pointerdown', () => {
      console.log('Process clicked:', process.id);
      gameObjects.draggedProcess = { graphics: process.graphics!, label: process.label! };
      process.graphics!.setDepth(100);
      process.label!.setDepth(101);
      process.graphics!.setAlpha(0.8);
      process.label!.setAlpha(0.8);
      
      if (gameObjects.feedbackText) {
        gameObjects.feedbackText.setText('');
      }
    });

    // Handle the drag events
    process.graphics.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      console.log('Dragging process:', process.id, dragX, dragY);
      
      // Update positions - dragX and dragY are world coordinates from pointer
      process.graphics!.x = dragX - GAME_CONFIG.PROCESS_BLOCK_WIDTH / 2;
      process.graphics!.y = dragY - GAME_CONFIG.PROCESS_BLOCK_HEIGHT / 2;
      process.label!.x = dragX;
      process.label!.y = dragY;
      
      // Check for hover over memory blocks using world coordinates
      checkMemoryBlockHover(dragX, dragY);
    });

    process.graphics.on('dragend', (pointer: Phaser.Input.Pointer) => {
      console.log('Drag ended for process:', process.id, pointer.x, pointer.y);
      
      // Use the drag end position
      const targetBlock = findTargetMemoryBlock(pointer.x, pointer.y);
      handleProcessDrop(process, targetBlock);
      
      gameObjects.draggedProcess = null;
      clearHoverEffects();
    });
    
  } catch (error) {
    console.warn('Error making process draggable:', error);
  }
}

function setupDragAndDrop() {
  // This function is now simplified as individual objects handle their own drag events
  console.log('Drag and drop setup complete');
}

// ===== HELPER FUNCTIONS =====
function findProcessByGraphics(graphics: Phaser.GameObjects.Graphics): Process | null {
  if (!graphics) return null;
  return gameState.processQueue.find(p => p.graphics === graphics) || null;
}

function findProcessByLabel(label: Phaser.GameObjects.Text): Process | null {
  if (!label) return null;
  return gameState.processQueue.find(p => p.label === label) || null;
}

function checkMemoryBlockHover(x: number, y: number) {
  clearHoverEffects();
  
  const width = scene.scale.width;
  const height = scene.scale.height;
  const ramHeight = height * 0.7;
  const ramX = width * 0.1;
  
  const hoveredBlock = gameState.memoryBlocks.find(block => {
    if (block.isOccupied || !block.graphics) return false;
    const yPos = calculateBlockYPosition(block);
    const blockHeight = Math.max((block.size / GAME_CONFIG.RAM_TOTAL_SIZE) * (ramHeight - 20), GAME_CONFIG.RAM_BLOCK_MIN_HEIGHT);
    return x >= ramX + 10 && x <= ramX + 10 + GAME_CONFIG.RAM_BLOCK_WIDTH &&
           y >= yPos && y <= yPos + blockHeight;
  });

  if (hoveredBlock) {
    gameObjects.hoverBlock = hoveredBlock;
    const yPos = calculateBlockYPosition(hoveredBlock);
    const blockHeight = Math.max((hoveredBlock.size / GAME_CONFIG.RAM_TOTAL_SIZE) * (ramHeight - 20), GAME_CONFIG.RAM_BLOCK_MIN_HEIGHT);
    
    hoveredBlock.graphics.clear();
    hoveredBlock.graphics.fillStyle(COLORS.RAM_HOVER, 0.6);
    hoveredBlock.graphics.lineStyle(2, 0xffffff, 1);
    hoveredBlock.graphics.fillRoundedRect(0, 0, GAME_CONFIG.RAM_BLOCK_WIDTH, blockHeight, 5);
    hoveredBlock.graphics.strokeRoundedRect(0, 0, GAME_CONFIG.RAM_BLOCK_WIDTH, blockHeight, 5);
  }
}

function clearHoverEffects() {
  if (gameObjects.hoverBlock) {
    const block = gameObjects.hoverBlock;
    const width = scene.scale.width;
    const height = scene.scale.height;
    const ramHeight = height * 0.7;
    const ramX = width * 0.1;
    
    block.graphics.clear();
    const blockHeight = Math.max((block.size / GAME_CONFIG.RAM_TOTAL_SIZE) * (ramHeight - 20), GAME_CONFIG.RAM_BLOCK_MIN_HEIGHT);
    const yPos = calculateBlockYPosition(block);
    
    block.graphics.fillStyle(COLORS.RAM_FREE, 0.3);
    block.graphics.lineStyle(2, 0xffffff, 0.4);
    block.graphics.fillRoundedRect(0, 0, GAME_CONFIG.RAM_BLOCK_WIDTH, blockHeight, 5);
    block.graphics.strokeRoundedRect(0, 0, GAME_CONFIG.RAM_BLOCK_WIDTH, blockHeight, 5);
    
    gameObjects.hoverBlock = null;
  }
}

function findTargetMemoryBlock(x: number, y: number): MemoryBlock | null {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const ramHeight = height * 0.7;
  const ramX = width * 0.1;
  
  return gameState.memoryBlocks.find(block => {
    if (block.isOccupied || !block.graphics) return false;
    const yPos = calculateBlockYPosition(block);
    const blockHeight = Math.max((block.size / GAME_CONFIG.RAM_TOTAL_SIZE) * (ramHeight - 20), GAME_CONFIG.RAM_BLOCK_MIN_HEIGHT);
    return x >= ramX + 10 && x <= ramX + 10 + GAME_CONFIG.RAM_BLOCK_WIDTH &&
           y >= yPos && y <= yPos + blockHeight;
  }) || null;
}

function calculateBlockYPosition(targetBlock: MemoryBlock): number {
  const height = scene.scale.height;
  const ramHeight = height * 0.7;
  const ramY = height * 0.15;
  
  let yPos = ramY + 10;
  for (const block of gameState.memoryBlocks) {
    if (block === targetBlock) break;
    const blockHeight = Math.max((block.size / GAME_CONFIG.RAM_TOTAL_SIZE) * (ramHeight - 20), GAME_CONFIG.RAM_BLOCK_MIN_HEIGHT);
    yPos += blockHeight + 5;
  }
  return yPos;
}

// ===== PROCESS ALLOCATION LOGIC =====
function handleProcessDrop(process: Process, targetBlock: MemoryBlock | null) {
  if (!targetBlock) {
    resetProcessPosition(process);
    showFeedback("Drop the process on a free memory block!", COLORS.ERROR);
    playErrorSound();
    return;
  }

  // Check if this follows First Fit strategy
  const firstFitBlock = findFirstFitBlock(process.size);
  
  if (!firstFitBlock) {
    resetProcessPosition(process);
    showFeedback(`No memory block available for ${process.name} (${process.size}MB)`, COLORS.ERROR);
    playErrorSound();
    return;
  }

  if (targetBlock !== firstFitBlock) {
    resetProcessPosition(process);
    showFeedback(`Wrong! First Fit chooses the FIRST available block. Try the block at position ${firstFitBlock.start}MB`, COLORS.ERROR);
    playErrorSound();
    return;
  }

  if (targetBlock.size < process.size) {
    resetProcessPosition(process);
    showFeedback(`${process.name} (${process.size}MB) won't fit in ${targetBlock.size}MB block!`, COLORS.ERROR);
    playErrorSound();
    return;
  }

  // Successful allocation
  allocateProcess(process, targetBlock);
}

function findFirstFitBlock(size: number): MemoryBlock | null {
  for (const block of gameState.memoryBlocks) {
    if (!block.isOccupied && block.size >= size) {
      return block;
    }
  }
  return null;
}

function allocateProcess(process: Process, block: MemoryBlock) {
  // Update block
  block.isOccupied = true;
  block.processId = process.id;
  block.color = process.color;

  // Update visuals
  updateBlockVisuals(block);
  
  // Remove process from queue visually
  if (process.graphics) process.graphics.setVisible(false);
  if (process.label) process.label.setVisible(false);
  
  // Mark as allocated
  process.allocated = true;
  gameState.allocatedProcesses++;
  gameState.score += 100;
  
  // Move to next process
  gameState.currentProcessIndex++;
  updateProcessQueue();
  
  // Show success feedback
  showSuccessEffect(block);
  showFeedback(`Great! ${process.name} allocated using First Fit strategy. +100 points!`, COLORS.SUCCESS);
  playSuccessSound();
  
  // Update score display
  if (gameObjects.scoreText) {
    gameObjects.scoreText.setText(`Score: ${gameState.score}`);
  }

  // Handle internal fragmentation (split block if necessary)
  if (block.size > process.size) {
    splitMemoryBlock(block, process.size);
  }

  // Check for level completion
  checkLevelCompletion();
}

function updateBlockVisuals(block: MemoryBlock) {
  if (!block.graphics) return;
  
  const width = scene.scale.width;
  const height = scene.scale.height;
  const ramHeight = height * 0.7;
  const ramX = width * 0.1;
  
  const blockHeight = Math.max((block.size / GAME_CONFIG.RAM_TOTAL_SIZE) * (ramHeight - 20), GAME_CONFIG.RAM_BLOCK_MIN_HEIGHT);
  const yPos = calculateBlockYPosition(block);
  
  block.graphics.clear();
  block.graphics.fillStyle(block.color || COLORS.RAM_USED, 0.8);
  block.graphics.lineStyle(2, 0xffffff, 0.8);
  block.graphics.fillRoundedRect(0, 0, GAME_CONFIG.RAM_BLOCK_WIDTH, blockHeight, 5);
  block.graphics.strokeRoundedRect(0, 0, GAME_CONFIG.RAM_BLOCK_WIDTH, blockHeight, 5);

  // Update label
  if (block.label) {
    block.label.setText(`${block.processId}\n${block.size}MB`);
    block.label.setColor(COLORS.TEXT_PRIMARY);
  }
}

function splitMemoryBlock(block: MemoryBlock, allocatedSize: number) {
  const remainingSize = block.size - allocatedSize;
  if (remainingSize <= 0) return;

  // Update current block
  block.size = allocatedSize;
  
  // Create new free block for remaining space
  const newBlock: MemoryBlock = {
    start: block.start + allocatedSize,
    size: remainingSize,
    isOccupied: false,
    color: COLORS.RAM_FREE,
    graphics: scene.add.graphics(),
    label: scene.add.text(0, 0, '', { fontSize: '12px', color: COLORS.TEXT_SECONDARY, fontFamily: 'Arial, sans-serif', align: 'center' }),
  };

  // Insert new block after current block
  const blockIndex = gameState.memoryBlocks.indexOf(block);
  gameState.memoryBlocks.splice(blockIndex + 1, 0, newBlock);
  
  // Recreate RAM visualization with new block structure
  recreateRAMVisualization();
}

function recreateRAMVisualization() {
  // Clear existing visuals
  gameState.memoryBlocks.forEach(block => {
    if (block.graphics) block.graphics.destroy();
    if (block.label) block.label.destroy();
  });

  const width = scene.scale.width;
  const height = scene.scale.height;
  const ramHeight = height * 0.7;
  const ramX = width * 0.1;
  const ramY = height * 0.15;

  // Recreate all blocks
  let currentY = ramY + 10;
  gameState.memoryBlocks.forEach((block, index) => {
    const blockHeight = Math.max((block.size / GAME_CONFIG.RAM_TOTAL_SIZE) * (ramHeight - 20), GAME_CONFIG.RAM_BLOCK_MIN_HEIGHT);
    
    // Create block graphics - Position the graphics object, then draw at (0,0)
    block.graphics = scene.add.graphics();
    block.graphics.x = ramX + 10;
    block.graphics.y = currentY;
    
    block.graphics.fillStyle(block.color || COLORS.RAM_FREE, block.isOccupied ? 0.8 : 0.3);
    block.graphics.lineStyle(2, 0xffffff, block.isOccupied ? 0.8 : 0.4);
    block.graphics.fillRoundedRect(0, 0, GAME_CONFIG.RAM_BLOCK_WIDTH, blockHeight, 5);
    block.graphics.strokeRoundedRect(0, 0, GAME_CONFIG.RAM_BLOCK_WIDTH, blockHeight, 5);

    // Make free blocks interactive for drop zones
    if (!block.isOccupied) {
      block.graphics.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, GAME_CONFIG.RAM_BLOCK_WIDTH, blockHeight),
        Phaser.Geom.Rectangle.Contains
      );
      block.graphics.setData('memoryBlock', block);
      block.graphics.setData('blockIndex', index);
    }

    // Create block label
    const labelText = block.isOccupied ?
      `${block.processId}\n${block.size}MB` :
      `Free\n${block.size}MB`;
    
    block.label = scene.add.text(
      ramX + 10 + GAME_CONFIG.RAM_BLOCK_WIDTH / 2,
      currentY + blockHeight / 2,
      labelText, {
      fontSize: '12px',
      color: block.isOccupied ? COLORS.TEXT_PRIMARY : COLORS.TEXT_SECONDARY,
      fontFamily: 'Arial, sans-serif',
      align: 'center',
    }).setOrigin(0.5);

    currentY += blockHeight + 5;
  });
}

// ===== PROCESS QUEUE MANAGEMENT =====
function updateProcessQueue() {
  gameState.processQueue.forEach((process, index) => {
    try {
      if (index === gameState.currentProcessIndex && !process.allocated && process.graphics && process.label) {
        // Make current process draggable
        process.graphics.setAlpha(1);
        process.label.setAlpha(1);
        makeProcessDraggable(process);
      } else if (!process.allocated && process.graphics && process.label) {
        // Dim non-current processes
        process.graphics.setAlpha(0.5);
        process.label.setAlpha(0.5);
        if (process.graphics.input && process.graphics.input.enabled) {
          process.graphics.disableInteractive();
        }
        if (process.label.input && process.label.input.enabled) {
          process.label.disableInteractive();
        }
      }
    } catch (error) {
      console.warn('Error updating process queue:', error);
    }
  });
}

function resetProcessPosition(process: Process) {
  if (!process.graphics || !process.label) return;
  
  const width = scene.scale.width;
  const height = scene.scale.height;
  const queueX = width * 0.7;
  const queueStartY = height * 0.25;
  
  const index = gameState.processQueue.indexOf(process);
  const yPos = queueStartY + index * (GAME_CONFIG.PROCESS_BLOCK_HEIGHT + 15);
  
  // Animate back to original position
  scene.tweens.add({
    targets: [process.graphics, process.label],
    x: process.graphics === gameObjects.draggedProcess?.graphics ?
        queueX - GAME_CONFIG.PROCESS_BLOCK_WIDTH / 2 : queueX,
    y: process.graphics === gameObjects.draggedProcess?.graphics ? yPos : yPos + GAME_CONFIG.PROCESS_BLOCK_HEIGHT / 2,
    duration: 200,
    ease: 'Power2',
    onComplete: () => {
      if (process.graphics && process.label) {
        process.graphics.setAlpha(1);
        process.label.setAlpha(1);
        process.graphics.setDepth(1);
        process.label.setDepth(2);
      }
    }
  });
}

// ===== VISUAL EFFECTS =====
function showSuccessEffect(block: MemoryBlock) {
  if (!block.graphics) return;
  
  const width = scene.scale.width;
  const height = scene.scale.height;
  const ramHeight = height * 0.7;
  const ramX = width * 0.1;
  
  // Create success flash effect
  const yPos = calculateBlockYPosition(block);
  const blockHeight = Math.max((block.size / GAME_CONFIG.RAM_TOTAL_SIZE) * (ramHeight - 20), GAME_CONFIG.RAM_BLOCK_MIN_HEIGHT);
  
  const flashOverlay = scene.add.graphics();
  flashOverlay.fillStyle(COLORS.SUCCESS, 0.6);
  flashOverlay.fillRect(ramX + 10, yPos, GAME_CONFIG.RAM_BLOCK_WIDTH, blockHeight);
  flashOverlay.setDepth(50);
  
  // Animate flash with pulse effect
  scene.tweens.add({
    targets: flashOverlay,
    alpha: 0,
    scaleX: 1.1,
    scaleY: 1.1,
    duration: GAME_CONFIG.SUCCESS_FLASH_DURATION,
    ease: 'Power2',
    onComplete: () => flashOverlay.destroy()
  });
  
  // Add floating +100 text effect
  const scorePopup = scene.add.text(ramX + 10 + GAME_CONFIG.RAM_BLOCK_WIDTH / 2, yPos, '+100', {
    fontSize: '18px',
    color: '#38a169',
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(51);
  
  scene.tweens.add({
    targets: scorePopup,
    y: yPos - 30,
    alpha: 0,
    duration: 800,
    ease: 'Power2',
    onComplete: () => scorePopup.destroy()
  });
}

function showFeedback(message: string, color: number) {
  if (!gameObjects.feedbackText) return;
  
  gameObjects.feedbackText.setText(message);
  gameObjects.feedbackText.setColor(color === COLORS.SUCCESS ? '#38a169' : '#e53e3e');
  
  // Fade out after delay
  scene.time.delayedCall(3000, () => {
    if (gameObjects.feedbackText) {
      scene.tweens.add({
        targets: gameObjects.feedbackText,
        alpha: 0,
        duration: 1000,
        onComplete: () => {
          if (gameObjects.feedbackText) {
            gameObjects.feedbackText.setText('');
            gameObjects.feedbackText.setAlpha(1);
          }
        }
      });
    }
  });
}

// ===== LEVEL COMPLETION =====
function checkLevelCompletion() {
  const unallocatedProcesses = gameState.processQueue.filter(p => !p.allocated);
  
  if (unallocatedProcesses.length === 0) {
    // All processes allocated
    gameState.gamePhase = 'completed';
    showLevelComplete();
  } else if (gameState.currentProcessIndex >= gameState.processQueue.length) {
    // No more processes to try
    gameState.gamePhase = 'completed';
    showLevelComplete();
  }
}

function showLevelComplete() {
  const width = scene.scale.width;
  const height = scene.scale.height;
  
  const completionBg = scene.add.graphics();
  completionBg.fillStyle(0x000000, 0.8);
  completionBg.fillRect(0, 0, width, height);
  completionBg.setDepth(200);

  const completionPanel = scene.add.container(width / 2, height / 2);
  completionPanel.setDepth(201);

  // Panel background
  const panelBg = scene.add.graphics();
  panelBg.fillStyle(COLORS.UI_BACKGROUND, 1);
  panelBg.lineStyle(3, COLORS.RAM_BORDER, 1);
  panelBg.fillRoundedRect(-200, -150, 400, 300, 15);
  panelBg.strokeRoundedRect(-200, -150, 400, 300, 15);
  completionPanel.add(panelBg);

  // Title
  const title = scene.add.text(0, -100, 'Level Complete!', {
    fontSize: '24px',
    color: COLORS.TEXT_PRIMARY,
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  completionPanel.add(title);

  // Stats
  const allocatedCount = gameState.processQueue.filter(p => p.allocated).length;
  const statsText = scene.add.text(0, -50, 
    `Processes Allocated: ${allocatedCount}/${gameState.processQueue.length}\n` +
    `Final Score: ${gameState.score}\n\n` +
    `First Fit Strategy:\n` +
    `✓ Fast allocation (O(n) time)\n` +
    `✓ Simple to implement\n` +
    `⚠ May cause fragmentation`, {
    fontSize: '14px',
    color: COLORS.TEXT_SECONDARY,
    fontFamily: 'Arial, sans-serif',
    align: 'center',
  }).setOrigin(0.5);
  completionPanel.add(statsText);

  // Restart button
  const restartBtn = scene.add.graphics();
  restartBtn.fillStyle(COLORS.SUCCESS, 1);
  restartBtn.fillRoundedRect(-60, 80, 120, 40, 8);
  restartBtn.setInteractive(new Phaser.Geom.Rectangle(-60, 80, 120, 40), Phaser.Geom.Rectangle.Contains);
  completionPanel.add(restartBtn);

  const restartText = scene.add.text(0, 100, 'Play Again', {
    fontSize: '16px',
    color: COLORS.TEXT_PRIMARY,
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  completionPanel.add(restartText);

  // Restart functionality
  restartBtn.on('pointerdown', () => {
    completionBg.destroy();
    completionPanel.destroy();
    restartGame();
  });

  gameObjects.completionPanel = completionPanel;
}

function restartGame() {
  // Clear existing objects
  scene.children.removeAll();
  
  // Reset and restart
  initializeGame();
  createGameUI();
  createRAMVisualization();
  createProcessQueue();
  setupDragAndDrop();
  createInstructions();
}

// ===== INSTRUCTIONS =====
function createInstructions() {
  const width = scene.scale.width;
  
  gameObjects.instructionText = scene.add.text(width / 2, 110,
    'Allocation Strategy: First Fit – Find the first available block that can fit the process', {
    fontSize: '14px',
    color: COLORS.TEXT_SECONDARY,
    fontFamily: 'Arial, sans-serif',
    align: 'center',
  }).setOrigin(0.5);
}

// ===== UPDATE FUNCTION =====
function update(this: Phaser.Scene) {
  // Game loop - currently no continuous updates needed
}
