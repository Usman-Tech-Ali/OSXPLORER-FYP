# SRTF (Shortest Remaining Time First) Game - Emergency Ward

## Game Overview
This is an interactive game that teaches the SRTF (Shortest Remaining Time First) CPU scheduling algorithm through an emergency ward scenario.

## Scenario
You are the only doctor on duty in the ER. Patients arrive with countdown timers showing their survival time. You must treat the patient who will die soonest (shortest remaining time). If a new patient arrives with less remaining time than the current patient, you must immediately switch (preemption).

## Game Mechanics

### Patient Attributes
- **Name**: Patient identifier
- **Arrival Time**: When the patient arrived at the ER
- **Original Burst Time**: Total treatment time needed
- **Remaining Time**: Time left before critical condition
- **Urgency Level**: Critical (2-4s), Urgent (5-7s), Stable (8-10s)

### Gameplay
1. **Patients Arrive**: 3-5 patients arrive with different survival times
2. **Survival Countdown**: Each patient has a red countdown bar showing remaining time
3. **Doctor Selection**: Click on the patient with the shortest remaining time
4. **Treatment**: Doctor moves to patient and begins treatment
5. **Preemption**: If a new patient arrives with less time, you must switch
6. **Completion**: Save all patients before their time runs out

### Scoring
- **Correct Selection**: +20 points
- **Wrong Selection**: -10 points
- **Patient Dies**: Game Over

## SRTF Algorithm Rules
1. Always select the patient with the **shortest remaining time**
2. **Preemptive**: Can interrupt current treatment for more urgent patient
3. Treatment reduces remaining time gradually
4. Waiting patients' survival time decreases automatically
5. If survival time hits 0 → Patient dies (FAIL)

## Assets Used
Located in: `/public/games/cpu-scheduling/assets/srtf/`
- `background.png` - Hospital emergency ward background
- `doctor-facetoleft.png` - Doctor sprite facing left
- `doctor-facetoright.png` - Doctor sprite facing right
- `bed1.png` to `bed5.png` - Patient beds with different patients

## Technical Implementation
- **Framework**: Phaser 3
- **Language**: TypeScript
- **Component**: React (Next.js)

## Key Features
- Real-time survival countdown bars
- Visual urgency indicators (color-coded)
- Preemptive scheduling demonstration
- Interactive patient selection
- Immediate feedback on correct/wrong choices
- Game over on patient death
- Results screen with statistics

## Learning Objectives
- Understand SRTF preemptive scheduling
- Learn when to preempt current process
- Recognize shortest remaining time priority
- Experience consequences of wrong scheduling decisions
- Master dynamic priority changes
