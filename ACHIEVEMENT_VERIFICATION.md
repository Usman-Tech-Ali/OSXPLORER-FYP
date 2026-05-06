# Achievement System Verification Guide

## ✅ Implementation Status

All games now have score submission integrated:

1. ✅ **Best Fit** (`memory-management/best-fit-l1`)
2. ✅ **First Fit** (`memory-management/first-fit-l1`)
3. ✅ **FCFS** (`cpu-scheduling/fcfs-l1`)
4. ✅ **SJF** (`cpu-scheduling/sjf-l1`)
5. ✅ **SRTF** (`cpu-scheduling/srtf-l1`)
6. ✅ **Critical Section** (`process-synchronization/critical-section-l1`)

## 🔍 How to Verify

### Step 1: Start the Development Server

```bash
cd osxplorer-FYP
npm run dev
```

### Step 2: Login/Register

1. Navigate to `http://localhost:3000`
2. Register a new account or login with existing credentials
3. Ensure you're authenticated (check for user menu in navbar)

### Step 3: Play a Game and Complete It

1. Navigate to any module (e.g., `http://localhost:3000/modules/memory-management/games/best-fit-l1`)
2. Play through the game until completion
3. When the results screen appears, the score should automatically be submitted

### Step 4: Check Browser Console

1. Open browser DevTools (F12)
2. Go to the Console tab
3. After completing a game, you should see:
   - No errors related to score submission
   - If achievements are unlocked, you'll see a success message

### Step 5: Verify Score Submission

**Option A: Check Network Tab**
1. Open DevTools → Network tab
2. Filter by "score"
3. Complete a game
4. You should see a POST request to `/api/score` with status 200
5. Check the response - it should include:
   ```json
   {
     "success": true,
     "score": {...},
     "xpGained": 50,
     "achievementsUnlocked": [...]
   }
   ```

**Option B: Check Database**
1. Connect to your MongoDB database
2. Check the `scores` collection - you should see new entries
3. Check the `users` collection - verify:
   - `totalXP` has increased
   - `achievements` array has new achievement IDs
   - `completedLevels` array has new level entries

### Step 6: Verify Achievements Page

1. Navigate to `http://localhost:3000/achievements`
2. You should see:
   - Real achievement data (not mock data)
   - Achievements you've unlocked showing as "completed"
   - Progress bars for in-progress achievements
   - Updated stats (total achievements, points, completion rate)

### Step 7: Test Achievement Unlocking

**Test "First Steps" Achievement:**
1. Complete your first game
2. Check achievements page - "First Steps" should be unlocked
3. You should see a notification in-game when it unlocks

**Test "Perfect Score" Achievement:**
1. Complete a game with a score of 100
2. "Perfect Score" achievement should unlock

**Test "Speed Demon" Achievement:**
1. Complete a game in under 30 seconds
2. "Speed Demon" achievement should unlock

**Test Module-Specific Achievements:**
1. Complete FCFS game with 85+ score → "FCFS Master" should unlock
2. Complete multiple memory management games → "Memory Architect" progress should update

### Step 8: Verify Leaderboard

1. Navigate to `http://localhost:3000/leaderboard`
2. Your user should appear with:
   - Updated total XP
   - Correct level
   - Number of achievements unlocked

## 🐛 Troubleshooting

### Score Not Submitting

**Check:**
1. Browser console for errors
2. Network tab for failed requests
3. API route is accessible: `http://localhost:3000/api/score`
4. User is authenticated (session exists)

**Common Issues:**
- **401 Unauthorized**: User not logged in
- **500 Internal Server Error**: Check server logs, database connection
- **CORS Error**: Check Next.js configuration

### Achievements Not Unlocking

**Check:**
1. Achievement criteria in `lib/achievements.ts`
2. Score submission includes correct game data
3. User model has achievements array
4. Achievement checking logic in `checkAchievement()` function

**Debug:**
- Add console.logs in `lib/achievements.ts` to see which achievements are being checked
- Check database to see if achievement IDs are being added to user document

### Achievements Page Shows Mock Data

**Check:**
1. API endpoint `/api/achievements` is working
2. Browser console for fetch errors
3. Network tab shows successful GET to `/api/achievements`
4. Component is using `achievementsData` from API, not mock `achievements`

## 📊 Expected Behavior

### After Completing a Game:

1. **Immediate:**
   - Score submitted to `/api/score`
   - Achievements checked and unlocked if criteria met
   - User XP and level updated
   - Notification shown if achievements unlocked

2. **In Database:**
   - New entry in `scores` collection
   - User document updated with:
     - Increased `totalXP`
     - New achievement IDs in `achievements` array
     - New level entry in `completedLevels` array
     - Updated `level` if XP threshold crossed

3. **On Achievements Page:**
   - Real-time status of all achievements
   - Progress bars for in-progress achievements
   - Unlock dates for completed achievements
   - Updated stats (total achievements, points, completion rate)

## 🎯 Test Checklist

- [ ] Complete Best Fit game → Score submitted
- [ ] Complete First Fit game → Score submitted
- [ ] Complete Worst Fit game → Score submitted
- [ ] Complete FCFS game → Score submitted
- [ ] Complete SJF game → Score submitted
- [ ] Complete SRTF game → Score submitted
- [ ] Complete Critical Section game → Score submitted
- [ ] Complete Mutex game → Score submitted
- [ ] Complete Binary Semaphore game → Score submitted
- [ ] Check achievements page shows real data
- [ ] Verify "First Steps" unlocks after first game
- [ ] Verify "Perfect Score" unlocks with 100 score
- [ ] Verify "Speed Demon" unlocks with <30s completion
- [ ] Check leaderboard shows updated XP
- [ ] Verify database has score entries
- [ ] Verify user document has achievements array

## 📝 Notes

- Score submission happens automatically when `showResults()` is called
- Achievements are checked server-side for security
- All achievement logic is in `lib/achievements.ts`
- Achievement status is calculated dynamically based on user progress
- Mock data is used as fallback if API fails (for development)

