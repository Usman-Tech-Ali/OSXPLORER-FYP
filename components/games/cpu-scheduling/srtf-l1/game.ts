import Phaser from 'phaser';

interface Patient {
  id: string;
  patientNumber: number;
  name: string;
  arrivalTime: number;
  originalBurstTime: number; // Total treatment time needed
  remainingTime: number; // Time left to complete treatment
  startTime?: number;
  completionTime?: number;
  waitingTime?: number;
  turnaroundTime?: number;
  urgency: 'critical' | 'urgent' | 'stable'; // Based on remaining time
  isCompleted: boolean;
  isTreating: boolean;
  bedSprite?: Phaser.GameObjects.Sprite;
  patientContainer?: Phaser.GameObjects.Container;
  survivalBar?: Phaser.GameObjects.Graphics;
  survivalBarBg?: Phaser.GameObjects.Graphics;
  survivalText?: Phaser.GameObjects.Text;
}

export class SRTFGame extends Phaser.Scene {
  private gamePhase: 'intro' | 'arrival' | 'treatment' | 'results' = 'intro';
  private patients: Patient[] = [];
  private readyQueue: Patient[] = [];
  private completedPatients: Patient[] = [];
  private currentTreatingPatient?: Patient;
  private gameStartTime: number = 0;
  private currentTime: number = 0;

  private doctorSprite!: Phaser.GameObjects.Sprite;
  private instructionText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;

  private readonly DOCTOR_X = 960;
  private readonly DOCTOR_Y = 540;
  
  private totalScore: number = 0;
  private wrongAttempts: number = 0;
  private patientsDied: number = 0;

  private readonly PATIENT_NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Emma', 'Frank'];
  
  private numPatients: number = 0;
  private timeEvent?: Phaser.Time.TimerEvent;
  private treatmentUpdateEvent?: Phaser.Time.TimerEvent;
  private nextPatientIndex: number = 0;
  private needsPreemption: boolean = false;
  private preemptionWarningShown: boolean = false;
  private penaltyPerSecond: number = 2; // Score penalty per second of not switching

  constructor() {
    super({ key: 'SRTFGame' });
  }

  preload() {
    const assetPath = '/games/cpu-scheduling/assets/srtf/';
    
    this.load.image('bg-hospital', `${assetPath}background.png`);
    this.load.image('doctor-left', `${assetPath}doctor-facetoleft.png`);
    this.load.image('doctor-right', `${assetPath}doctor-facetoright.png`);
    this.load.image('bed-1', `${assetPath}bed1.png`);
    this.load.image('bed-2', `${assetPath}bed2.png`);
    this.load.image('bed-3', `${assetPath}bed3.png`);
    this.load.image('bed-4', `${assetPath}bed4.png`);
    this.load.image('bed-5', `${assetPath}bed5.png`);
  }

  create() {
    const { width, height } = this.sys.game.canvas;

    this.cleanupPreviousGame();

    // Add background - simple full screen like mutex game
    const bgImage = this.add.image(width / 2, height / 2, 'bg-hospital');
    bgImage.setDisplaySize(width, height);
    bgImage.setDepth(-100);

    this.createDoctor();
    this.createUI(width, height);
    
    this.showIntroScenario(width, height);
  }

  private cleanupPreviousGame() {
    this.patients = [];
    this.readyQueue = [];
    this.completedPatients = [];
    this.currentTreatingPatient = undefined;
    this.gameStartTime = 0;
    this.currentTime = 0;
    this.totalScore = 0;
    this.wrongAttempts = 0;
    this.patientsDied = 0;
    this.numPatients = 0;
    this.nextPatientIndex = 0;
    this.needsPreemption = false;
    this.preemptionWarningShown = false;
  }

  private createDoctor() {
    const { width, height } = this.sys.game.canvas;
    // Position doctor in center initially
    this.doctorSprite = this.add.sprite(width * 0.5, height * 0.4, 'doctor-right');
    this.doctorSprite.setScale(0.18); // Smaller doctor
    this.doctorSprite.setDepth(10);
  }

  private createUI(width: number, height: number) {
    // Simple UI like mutex game - no navbar
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    });
    this.scoreText.setDepth(20);

    this.timeText = this.add.text(20, 55, 'Time: 0s', {
      fontSize: '20px',
      color: '#00FFFF',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    });
    this.timeText.setDepth(20);

    this.phaseText = this.add.text(width / 2, 20, 'Phase: Intro', {
      fontSize: '20px',
      color: '#00FF00',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5);
    this.phaseText.setDepth(20);

    this.instructionText = this.add.text(width / 2, height - 40, '', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: '#000000DD',
      padding: { x: 15, y: 8 },
      align: 'center'
    }).setOrigin(0.5);
    this.instructionText.setDepth(20);
  }

  private showIntroScenario(width: number, height: number) {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(300);

    const boxWidth = 750;
    const boxHeight = 650;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const scenarioBox = this.add.graphics();
    scenarioBox.fillStyle(0x0a0e27, 0.98);
    scenarioBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    scenarioBox.lineStyle(4, 0xFF4444, 1);
    scenarioBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    scenarioBox.setDepth(301);

    const title = this.add.text(width / 2, boxY + 50, '🚨 SRTF SCHEDULING', {
      fontSize: '36px',
      color: '#FF4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(302);

    const subtitle = this.add.text(width / 2, boxY + 95, 'Shortest Remaining Time First - Preemptive Scheduling', {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: '600'
    }).setOrigin(0.5).setDepth(302);

    const contentY = boxY + 145;

    const storyTitle = this.add.text(boxX + 50, contentY, '🏥 SRTF Concept', {
      fontSize: '20px',
      color: '#FF4444',
      fontStyle: 'bold'
    }).setDepth(302);

    const story = `   You are the doctor treating patients.
   Each patient has a treatment time (burst time).
   Always treat the patient with SHORTEST remaining time.
   When you switch patients, the old patient's time PAUSES!`;

    const storyText = this.add.text(boxX + 50, contentY + 35, story, {
      fontSize: '16px',
      color: '#E0E0E0',
      lineSpacing: 6
    }).setDepth(302);

    const rulesTitle = this.add.text(boxX + 50, contentY + 155, '⚠️ SRTF Rules', {
      fontSize: '20px',
      color: '#FF4444',
      fontStyle: 'bold'
    }).setDepth(302);

    const rules = `   • Always treat patient with SHORTEST remaining time
   • Preemption: Switch if new patient has shorter time
   • Paused patients: Time FREEZES when not being treated
   • Only active patient's time decreases
   • Correct selection: +20 pts | Wrong: -10 pts`;

    const rulesText = this.add.text(boxX + 50, contentY + 190, rules, {
      fontSize: '16px',
      color: '#E0E0E0',
      lineSpacing: 6
    }).setDepth(302);

    const goalTitle = this.add.text(boxX + 50, contentY + 320, '🎯 Goal', {
      fontSize: '20px',
      color: '#FF4444',
      fontStyle: 'bold'
    }).setDepth(302);

    const goal = `   Save all patients by treating them in SRTF order!`;

    const goalText = this.add.text(boxX + 50, contentY + 355, goal, {
      fontSize: '16px',
      color: '#00ff88',
      fontStyle: '600'
    }).setDepth(302);

    const buttonWidth = 200;
    const buttonHeight = 55;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = boxY + boxHeight - 75;

    const startButton = this.add.graphics();
    startButton.fillGradientStyle(0xFF4444, 0xFF4444, 0xCC0000, 0xCC0000, 1);
    startButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
    startButton.setDepth(302);

    const buttonText = this.add.text(width / 2, buttonY + 27, '🚀 START GAME', {
      fontSize: '22px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(303);

    startButton.setInteractive(
      new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );

    startButton.on('pointerdown', () => {
      overlay.destroy();
      scenarioBox.destroy();
      title.destroy();
      subtitle.destroy();
      storyTitle.destroy();
      storyText.destroy();
      rulesTitle.destroy();
      rulesText.destroy();
      goalTitle.destroy();
      goalText.destroy();
      startButton.destroy();
      buttonText.destroy();
      
      this.startArrivalPhase();
    });
  }

  private startArrivalPhase() {
    this.gamePhase = 'arrival';
    this.gameStartTime = Date.now(); // Track game start time
    this.gameStartTime = this.time.now;
    this.currentTime = 0;
    
    this.numPatients = 6; // 6 patients for more preemption scenarios
    
    this.phaseText.setText('Phase: Patients Arriving');
    this.instructionText.setText(`🚨 ${this.numPatients} critical patients will arrive! Watch for preemption!`);
    
    this.timeEvent = this.time.addEvent({
      delay: 100,
      callback: this.updateClock,
      callbackScope: this,
      loop: true
    });
    
    // Treatment progress update - realistic timing (every 1 second, decrease by 1)
    // In SRTF, only the actively treated patient's time decreases
    this.treatmentUpdateEvent = this.time.addEvent({
      delay: 1000,
      callback: this.updateTreatmentProgress,
      callbackScope: this,
      loop: true
    });
    
    // Create patient data but don't show them yet
    this.preparePatients();
    
    // Start with first patient arriving
    this.time.delayedCall(2000, () => {
      this.arriveNextPatient();
    });
  }

  private preparePatients() {
    const { width, height } = this.sys.game.canvas;
    
    // 4 bed positions - spread across screen, using full width, positioned lower
    const bedPositions = [
      { x: width * 0.15, y: height * 0.50 },  // Bottom left
      { x: width * 0.40, y: height * 0.50 },  // Bottom center-left
      { x: width * 0.65, y: height * 0.50 },  // Bottom center-right
      { x: width * 0.15, y: height * 0.75 }   // Very bottom left
    ];

    // SRTF teaching scenario: 6 patients with realistic burst times
    // Designed to create clear preemption scenarios
    const burstTimes = [15, 6, 10, 3, 8, 5]; 
    const arrivalTimes = [0, 4, 8, 12, 16, 20]; // Spaced out for better preemption teaching
    
    // Patient 1 (Alice): 15s, arrives at 0s - starts treatment
    // Patient 2 (Bob): 6s, arrives at 4s - PREEMPTS (6s < 11s remaining)
    // Patient 3 (Carol): 10s, arrives at 8s - waits (10s > 2s remaining)
    // Patient 4 (Dave): 3s, arrives at 12s - PREEMPTS (3s < 10s remaining)
    // Patient 5 (Emma): 8s, arrives at 16s - waits or may preempt
    // Patient 6 (Frank): 5s, arrives at 20s - may preempt depending on queue state

    const patientNames = ['Alice', 'Bob', 'Carol', 'Dave', 'Emma', 'Frank'];

    for (let i = 0; i < this.numPatients; i++) {
      // Reuse bed positions (cycle through 4 beds)
      const bedIndex = i % 4;
      const bedImage = `bed-${bedIndex + 1}`;
      
      const burstTime = burstTimes[i];
      const urgency: 'critical' | 'urgent' | 'stable' = 
        burstTime <= 3 ? 'critical' : burstTime <= 6 ? 'urgent' : 'stable';

      const patient: Patient = {
        id: `patient-${i + 1}`,
        patientNumber: i + 1,
        name: patientNames[i],
        arrivalTime: arrivalTimes[i],
        originalBurstTime: burstTime,
        remainingTime: burstTime,
        urgency: urgency,
        isCompleted: false,
        isTreating: false
      };

      this.patients.push(patient);
    }
  }

  private arriveNextPatient() {
    if (this.nextPatientIndex >= this.numPatients) {
      return; // All patients have arrived
    }

    const patient = this.patients[this.nextPatientIndex];
    const { width, height } = this.sys.game.canvas;
    
    // Reuse bed positions (4 beds for 6 patients) - spread across screen
    const bedPositions = [
      { x: width * 0.15, y: height * 0.50 },  // Bottom left
      { x: width * 0.40, y: height * 0.50 },  // Bottom center-left
      { x: width * 0.65, y: height * 0.50 },  // Bottom center-right
      { x: width * 0.15, y: height * 0.75 }   // Very bottom left
    ];
    
    const bedIndex = this.nextPatientIndex % 4; // Cycle through 4 beds
    const pos = bedPositions[bedIndex];
    const bedImage = `bed-${bedIndex + 1}`;
    
    // Create bed sprite - smaller scale
    const bedSprite = this.add.sprite(pos.x, pos.y, bedImage);
    bedSprite.setScale(0.25); // Smaller beds
    bedSprite.setDepth(5);
    bedSprite.setAlpha(0);
    
    patient.bedSprite = bedSprite;
    
    // Fade in animation
    this.tweens.add({
      targets: bedSprite,
      alpha: 1,
      duration: 500,
      onComplete: () => {
        this.createPatientUI(patient, pos.x, pos.y);
        this.readyQueue.push(patient);
        
        this.showMessage(`🚨 ${patient.name} arrived! (${Math.ceil(patient.remainingTime)}s remaining)`, '#FF4444');
        
        this.nextPatientIndex++;
        
        // Check if we need preemption
        if (this.currentTreatingPatient) {
          // Check if the newly arrived patient has shorter remaining time than current patient
          if (patient.remainingTime < this.currentTreatingPatient.remainingTime) {
            // Preemption needed!
            this.needsPreemption = true;
            this.preemptionWarningShown = false; // Reset for new preemption scenario
            this.instructionText.setText(`⚠️ PREEMPTION NEEDED! Click on ${patient.name} (${Math.ceil(patient.remainingTime)}s) - shorter than ${this.currentTreatingPatient.name} (${Math.ceil(this.currentTreatingPatient.remainingTime)}s)!`);
            
            // Flash the patient that needs attention
            this.flashPatient(patient);
            
            // Show immediate warning
            this.showMessage(
              `🚨 PREEMPT NOW! ${patient.name} has shorter time!\nYou'll lose ${this.penaltyPerSecond} pts/sec if you don't switch!`,
              '#FF6600'
            );
          } else {
            this.instructionText.setText(`🩺 Treating ${this.currentTreatingPatient.name}... ${patient.name} will wait (${Math.ceil(patient.remainingTime)}s > ${Math.ceil(this.currentTreatingPatient.remainingTime)}s)`);
          }
        } else {
          // No one being treated, auto-start treatment
          this.autoStartTreatment();
        }
        
        // Schedule next patient arrival based on arrival time
        if (this.nextPatientIndex < this.numPatients) {
          const nextPatient = this.patients[this.nextPatientIndex];
          const currentPatient = this.patients[this.nextPatientIndex - 1];
          const delay = (nextPatient.arrivalTime - currentPatient.arrivalTime) * 1000; // Real-time seconds
          
          this.time.delayedCall(delay, () => {
            this.arriveNextPatient();
          });
        }
      }
    });
  }

  private autoStartTreatment() {
    if (this.readyQueue.length === 0) return;
    
    const shortestPatient = this.readyQueue.reduce((prev, curr) => 
      curr.remainingTime < prev.remainingTime ? curr : prev
    );
    
    this.instructionText.setText(`🩺 Doctor automatically treating ${shortestPatient.name} (shortest time: ${Math.ceil(shortestPatient.remainingTime)}s)`);
    
    this.time.delayedCall(1000, () => {
      this.treatPatient(shortestPatient, true);
    });
  }

  private flashPatient(patient: Patient) {
    if (!patient.patientContainer) return;
    
    this.tweens.add({
      targets: patient.patientContainer,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 300,
      yoyo: true,
      repeat: 3
    });
  }

  private createPatientUI(patient: Patient, x: number, y: number) {
    const container = this.add.container(x, y - 80);
    container.setDepth(15);

    // Patient name
    const nameText = this.add.text(0, 0, patient.name, {
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      backgroundColor: '#000000AA',
      padding: { x: 6, y: 3 }
    }).setOrigin(0.5);
    container.add(nameText);

    // Survival bar background
    const barWidth = 120;
    const barHeight = 20;
    const survivalBarBg = this.add.graphics();
    survivalBarBg.fillStyle(0x333333, 0.9);
    survivalBarBg.fillRoundedRect(-barWidth / 2, 20, barWidth, barHeight, 8);
    container.add(survivalBarBg);

    // Survival bar
    const survivalBar = this.add.graphics();
    container.add(survivalBar);

    // Survival time text
    const survivalText = this.add.text(0, 30, `${Math.ceil(patient.remainingTime)}s`, {
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    container.add(survivalText);

    patient.patientContainer = container;
    patient.survivalBar = survivalBar;
    patient.survivalBarBg = survivalBarBg;
    patient.survivalText = survivalText;

    this.updateSurvivalBar(patient);

    // Make patient clickable
    const hitArea = new Phaser.Geom.Rectangle(-60, -20, 120, 80);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    container.on('pointerdown', () => {
      if (this.gamePhase === 'treatment' || this.gamePhase === 'arrival') {
        this.onPatientClick(patient);
      }
    });
    
    // Add cursor pointer on hover
    container.on('pointerover', () => {
      if (!patient.isCompleted) {
        this.sys.canvas.style.cursor = 'pointer';
      }
    });
    
    container.on('pointerout', () => {
      this.sys.canvas.style.cursor = 'default';
    });

    // Visual hover effects for survival bar
    const originalHoverHandler = container.listeners('pointerover')[0];
    container.on('pointerover', () => {
      if (!patient.isCompleted && (this.gamePhase === 'treatment' || this.gamePhase === 'arrival')) {
        survivalBarBg.clear();
        survivalBarBg.fillStyle(0x555555, 0.9);
        survivalBarBg.fillRoundedRect(-60, 20, 120, 20, 8);
      }
    });

    const originalOutHandler = container.listeners('pointerout')[0];
    container.on('pointerout', () => {
      if (!patient.isCompleted) {
        survivalBarBg.clear();
        survivalBarBg.fillStyle(0x333333, 0.9);
        survivalBarBg.fillRoundedRect(-60, 20, 120, 20, 8);
      }
    });
  }

  private updateSurvivalBar(patient: Patient) {
    if (!patient.survivalBar || !patient.survivalText) return;

    const barWidth = 120;
    const barHeight = 20;
    const percentage = patient.remainingTime / patient.originalBurstTime;
    const currentWidth = barWidth * percentage;

    // Color based on urgency
    let barColor = 0x00FF00; // Green
    if (percentage < 0.3) {
      barColor = 0xFF0000; // Red
    } else if (percentage < 0.6) {
      barColor = 0xFFAA00; // Orange
    }

    patient.survivalBar.clear();
    patient.survivalBar.fillStyle(barColor, 1);
    patient.survivalBar.fillRoundedRect(-barWidth / 2, 20, currentWidth, barHeight, 8);

    patient.survivalText.setText(`${Math.ceil(patient.remainingTime)}s`);
    patient.survivalText.setColor(percentage < 0.3 ? '#FF0000' : '#FFFFFF');
  }

  private startTreatmentPhase() {
    this.gamePhase = 'treatment';
    this.phaseText.setText('Phase: Emergency Treatment (SRTF)');
  }

  private onPatientClick(clickedPatient: Patient) {
    if (clickedPatient.isCompleted) {
      this.showMessage('✅ Patient already treated!', '#00FF00');
      return;
    }

    // Find the patient with shortest remaining time (including current patient if being treated)
    let shortestPatient = clickedPatient;
    
    // Check all waiting patients
    this.readyQueue.forEach(patient => {
      if (!patient.isCompleted && patient.remainingTime < shortestPatient.remainingTime) {
        shortestPatient = patient;
      }
    });
    
    // Also check current treating patient
    if (this.currentTreatingPatient && 
        !this.currentTreatingPatient.isCompleted && 
        this.currentTreatingPatient.remainingTime < shortestPatient.remainingTime) {
      shortestPatient = this.currentTreatingPatient;
    }

    // Check if clicked patient is the shortest
    if (clickedPatient.id !== shortestPatient.id) {
      this.wrongAttempts++;
      this.totalScore = Math.max(0, this.totalScore - 10);
      this.scoreText.setText(`Score: ${this.totalScore}`);
      this.showMessage(
        `❌ WRONG! SRTF Rule: Always treat SHORTEST remaining time!\n${shortestPatient.name} has ${Math.ceil(shortestPatient.remainingTime)}s < ${clickedPatient.name} has ${Math.ceil(clickedPatient.remainingTime)}s`,
        '#FF0000'
      );
      
      // Flash correct patient
      this.flashPatient(shortestPatient);
      return;
    }

    // Correct selection!
    if (this.currentTreatingPatient) {
      // Check if this is a preemption scenario
      if (clickedPatient.remainingTime < this.currentTreatingPatient.remainingTime) {
        // Preemption scenario
        this.showMessage(`✅ Correct! Preempting ${this.currentTreatingPatient.name} for ${clickedPatient.name}`, '#00FF00');
        this.preemptCurrentPatient(clickedPatient);
      } else if (clickedPatient.id === this.currentTreatingPatient.id) {
        // Clicking on current patient
        this.showMessage('⚠️ Doctor is already treating this patient!', '#FFA500');
      } else {
        // Trying to switch to longer patient
        this.showMessage('⚠️ No preemption needed! Current patient has shorter time!', '#FFA500');
      }
    } else {
      // No one being treated, start new treatment
      this.treatPatient(clickedPatient, false);
    }
  }

  private treatPatient(patient: Patient, isAuto: boolean) {
    const index = this.readyQueue.indexOf(patient);
    if (index > -1) {
      this.readyQueue.splice(index, 1);
    }

    this.currentTreatingPatient = patient;
    patient.isTreating = true;
    patient.startTime = this.currentTime;
    this.needsPreemption = false;

    if (!isAuto) {
      this.totalScore += 20;
      this.scoreText.setText(`Score: ${this.totalScore}`);
    }

    this.instructionText.setText(`🩺 Treating ${patient.name}... (${Math.ceil(patient.remainingTime)}s remaining)`);

    // Move doctor to patient
    const patientX = patient.bedSprite!.x;
    const patientY = patient.bedSprite!.y;
    const doctorTargetX = patientX + 80; // Stand to the right of bed
    const doctorImage = patientX < this.doctorSprite.x ? 'doctor-left' : 'doctor-right';
    
    this.doctorSprite.setTexture(doctorImage);
    
    this.tweens.add({
      targets: this.doctorSprite,
      x: doctorTargetX,
      y: patientY,
      duration: 800,
      ease: 'Power2'
    });
  }

  private preemptCurrentPatient(newPatient: Patient) {
    if (!this.currentTreatingPatient) return;
    
    // Put current patient back in queue
    const oldPatient = this.currentTreatingPatient;
    oldPatient.isTreating = false;
    this.readyQueue.push(oldPatient);
    
    this.totalScore += 20;
    this.scoreText.setText(`Score: ${this.totalScore}`);
    
    // Reset preemption warning
    this.needsPreemption = false;
    this.preemptionWarningShown = false;
    
    // Start treating new patient
    this.treatPatient(newPatient, false);
  }

  private updateTreatmentProgress() {
    if (!this.currentTreatingPatient || this.currentTreatingPatient.isCompleted) return;
    
    this.currentTreatingPatient.remainingTime = Math.max(0, this.currentTreatingPatient.remainingTime - 1);
    this.updateSurvivalBar(this.currentTreatingPatient);
    
    // Check if there's a shorter patient waiting (preemption needed)
    if (this.readyQueue.length > 0) {
      const shortestWaiting = this.readyQueue.reduce((prev, curr) => 
        curr.remainingTime < prev.remainingTime ? curr : prev
      );
      
      if (shortestWaiting.remainingTime < this.currentTreatingPatient.remainingTime) {
        // Preemption should happen but user hasn't switched!
        this.needsPreemption = true;
        
        // Apply penalty every second
        this.totalScore = Math.max(0, this.totalScore - this.penaltyPerSecond);
        this.scoreText.setText(`Score: ${this.totalScore}`);
        
        // Show warning (only once per preemption scenario)
        if (!this.preemptionWarningShown) {
          this.preemptionWarningShown = true;
          this.showMessage(
            `⚠️ LOSING POINTS! Switch to ${shortestWaiting.name} (${Math.ceil(shortestWaiting.remainingTime)}s)!\n-${this.penaltyPerSecond} pts/sec`,
            '#FF6600'
          );
          this.flashPatient(shortestWaiting);
        }
        
        this.instructionText.setText(`⚠️ SWITCH NOW! ${shortestWaiting.name} (${Math.ceil(shortestWaiting.remainingTime)}s) < ${this.currentTreatingPatient.name} (${Math.ceil(this.currentTreatingPatient.remainingTime)}s) | -${this.penaltyPerSecond} pts/sec`);
      } else {
        this.needsPreemption = false;
        this.preemptionWarningShown = false;
      }
    }
    
    if (this.currentTreatingPatient.remainingTime <= 0) {
      this.completeTreatment(this.currentTreatingPatient);
    } else if (!this.needsPreemption) {
      this.instructionText.setText(`🩺 Treating ${this.currentTreatingPatient.name}... (${Math.ceil(this.currentTreatingPatient.remainingTime)}s remaining)`);
    }
  }



  private completeTreatment(patient: Patient) {
    patient.isCompleted = true;
    patient.isTreating = false;
    patient.completionTime = this.currentTime;
    this.currentTreatingPatient = undefined;

    this.completedPatients.push(patient);

    // Add score for saving patient
    this.totalScore += 50;
    this.scoreText.setText(`Score: ${this.totalScore}`);

    // Visual feedback - fade out and destroy
    if (patient.patientContainer) {
      this.tweens.add({
        targets: patient.patientContainer,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          patient.patientContainer?.destroy();
        }
      });
    }
    
    // Destroy bed to free it up
    if (patient.bedSprite) {
      this.tweens.add({
        targets: patient.bedSprite,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          patient.bedSprite?.destroy();
        }
      });
    }

    this.showMessage(`✅ ${patient.name} saved! +50 pts`, '#00FF00');

    // Check if all patients processed
    const allProcessed = this.completedPatients.length + this.patientsDied >= this.numPatients;
    
    if (allProcessed) {
      this.time.delayedCall(1500, () => {
        this.showResults();
      });
    } else {
      // Auto-start next treatment if patients waiting
      this.time.delayedCall(1000, () => {
        if (this.readyQueue.length > 0) {
          this.autoStartTreatment();
        } else {
          this.instructionText.setText('⏳ Waiting for next patient to arrive...');
        }
      });
    }
  }

  private updateSurvivalTimers() {
    // SRTF RULE: Only the patient being treated has their time decrease
    // Waiting patients' burst time is PAUSED (frozen) until they are treated
    // This is the key difference from real-time systems
    
    // No automatic time decrease for waiting patients in SRTF
    // Their remaining time only decreases when they are being actively treated
  }

  private patientDied(patient: Patient) {
    patient.isCompleted = true;
    this.patientsDied++;

    const index = this.readyQueue.indexOf(patient);
    if (index > -1) {
      this.readyQueue.splice(index, 1);
    }

    // Fade out and destroy patient UI
    if (patient.patientContainer) {
      this.tweens.add({
        targets: patient.patientContainer,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          patient.patientContainer?.destroy();
        }
      });
    }
    
    // Destroy bed sprite to free up the bed
    if (patient.bedSprite) {
      this.tweens.add({
        targets: patient.bedSprite,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          patient.bedSprite?.destroy();
        }
      });
    }

    this.showMessage(`💀 ${patient.name} died! -50 pts`, '#FF0000');
    
    this.totalScore = Math.max(0, this.totalScore - 50); // Penalty for death
    this.scoreText.setText(`Score: ${this.totalScore}`);

    // Continue game - don't end immediately
    const allPatientsProcessed = this.completedPatients.length + this.patientsDied >= this.numPatients;
    
    if (allPatientsProcessed) {
      this.time.delayedCall(2000, () => {
        this.showResults();
      });
    } else {
      // Continue with next patient
      this.time.delayedCall(1500, () => {
        if (this.readyQueue.length > 0 && !this.currentTreatingPatient) {
          this.autoStartTreatment();
        }
      });
    }
  }

  private updateClock() {
    this.currentTime = Math.floor((this.time.now - this.gameStartTime) / 1000);
    this.timeText.setText(`Time: ${this.currentTime}s`);
  }

  private showMessage(text: string, color: string) {
    const { width, height } = this.sys.game.canvas;
    const message = this.add.text(width / 2, height / 2, text, {
      fontSize: '24px',
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: '#000000DD',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);
    message.setDepth(100);

    this.tweens.add({
      targets: message,
      alpha: 0,
      y: height / 2 - 50,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => message.destroy()
    });
  }

  private showResults() {
    this.gamePhase = 'results';
    
    if (this.timeEvent) {
      this.timeEvent.remove();
    }
    if (this.treatmentUpdateEvent) {
      this.treatmentUpdateEvent.remove();
    }

    const { width, height } = this.sys.game.canvas;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(300);

    const boxWidth = 600;
    const boxHeight = 500;
    const boxX = width / 2 - boxWidth / 2;
    const boxY = height / 2 - boxHeight / 2;

    const resultsBox = this.add.graphics();
    resultsBox.fillStyle(0x0a0e27, 0.98);
    resultsBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    resultsBox.lineStyle(4, this.patientsDied > 0 ? 0xFF0000 : 0x00FF00, 1);
    resultsBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    resultsBox.setDepth(301);

    const patientsSaved = this.completedPatients.length;
    const successRate = Math.round((patientsSaved / this.numPatients) * 100);
    
    const title = this.add.text(width / 2, boxY + 50, 
      this.patientsDied === 0 ? '✅ PERFECT! ALL SAVED!' : 
      this.patientsDied >= this.numPatients / 2 ? '💀 MANY DIED!' : 
      '⚠️ GAME COMPLETE', {
      fontSize: '32px',
      color: this.patientsDied === 0 ? '#00FF00' : 
             this.patientsDied >= this.numPatients / 2 ? '#FF0000' : '#FFA500',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(302);

    const stats = `
Final Score: ${this.totalScore}
Patients Saved: ${patientsSaved}/${this.numPatients} (${successRate}%)
Patients Died: ${this.patientsDied}
Wrong Attempts: ${this.wrongAttempts}
Total Time: ${this.currentTime}s

${this.patientsDied === 0 ? '🎉 Perfect SRTF execution!' : 
  this.patientsDied > 0 ? '💡 Remember: Always treat shortest remaining time!' : ''}
    `;

    // Submit score to backend
    this.submitScore();

    const statsText = this.add.text(width / 2, boxY + 150, stats, {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5).setDepth(302);

    const buttonWidth = 180;
    const buttonHeight = 50;
    const buttonX = width / 2 - buttonWidth / 2;
    const buttonY = boxY + boxHeight - 80;

    const restartButton = this.add.graphics();
    restartButton.fillGradientStyle(0x4CAF50, 0x4CAF50, 0x388E3C, 0x388E3C, 1);
    restartButton.fillRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 12);
    restartButton.setDepth(302);

    const buttonText = this.add.text(width / 2, buttonY + 25, '🔄 PLAY AGAIN', {
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(303);

    restartButton.setInteractive(
      new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight),
      Phaser.Geom.Rectangle.Contains
    );

    restartButton.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  private async submitScore() {
    try {
      const timeSpent = Math.floor((Date.now() - this.gameStartTime) / 1000);
      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: 'srtf-l1',
          moduleId: 'cpu-scheduling',
          levelId: 'l1',
          score: Math.max(0, this.totalScore),
          timeSpent,
          accuracy: this.wrongAttempts === 0 ? 100 : Math.max(0, 100 - (this.wrongAttempts * 10)),
          wrongAttempts: this.wrongAttempts,
          metadata: {
            patientsSaved: this.completedPatients.length,
            patientsDied: this.patientsDied,
            totalPatients: this.numPatients
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.achievementsUnlocked && result.achievementsUnlocked.length > 0) {
          this.showMessage(
            `🎉 Achievement Unlocked! ${result.achievementsUnlocked.length} new achievement(s)`,
            '#00FF00',
            3000
          );
        }
      }
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  }
}
