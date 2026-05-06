import { ACHIEVEMENT_DEFINITIONS } from '@/lib/achievements'

describe('Achievement Definitions', () => {
  it('should have valid achievement structure', () => {
    ACHIEVEMENT_DEFINITIONS.forEach((achievement) => {
      expect(achievement).toHaveProperty('id')
      expect(achievement).toHaveProperty('title')
      expect(achievement).toHaveProperty('description')
      expect(achievement).toHaveProperty('points')
      expect(achievement).toHaveProperty('category')
      expect(achievement).toHaveProperty('rarity')
      expect(achievement).toHaveProperty('criteria')

      // Validate types
      expect(typeof achievement.id).toBe('string')
      expect(typeof achievement.title).toBe('string')
      expect(typeof achievement.description).toBe('string')
      expect(typeof achievement.points).toBe('number')
      expect(['performance', 'progress', 'module', 'special', 'badge']).toContain(achievement.category)
      expect(['common', 'rare', 'epic', 'legendary']).toContain(achievement.rarity)
    })
  })

  it('should have unique achievement IDs', () => {
    const ids = ACHIEVEMENT_DEFINITIONS.map((a) => a.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should have positive point values', () => {
    ACHIEVEMENT_DEFINITIONS.forEach((achievement) => {
      expect(achievement.points).toBeGreaterThan(0)
    })
  })

  it('should have appropriate points for rarity', () => {
    const rarityPoints = {
      common: { min: 0, max: 100 },
      rare: { min: 75, max: 200 },
      epic: { min: 150, max: 300 },
      legendary: { min: 250, max: 500 },
    }

    ACHIEVEMENT_DEFINITIONS.forEach((achievement) => {
      const range = rarityPoints[achievement.rarity]
      expect(achievement.points).toBeGreaterThanOrEqual(range.min)
      expect(achievement.points).toBeLessThanOrEqual(range.max)
    })
  })

  it('should have valid criteria types', () => {
    const validCriteriaTypes = [
      'first_level',
      'perfect_score',
      'score_threshold',
      'time_threshold',
      'levels_completed',
      'module_completion',
      'streak',
      'consecutive_scores',
    ]

    ACHIEVEMENT_DEFINITIONS.forEach((achievement) => {
      expect(validCriteriaTypes).toContain(achievement.criteria.type)
      expect(typeof achievement.criteria.value).toBe('number')
    })
  })

  it('should have module property for module category achievements', () => {
    const moduleAchievements = ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === 'module')
    
    moduleAchievements.forEach((achievement) => {
      expect(achievement.module).toBeDefined()
      expect(typeof achievement.module).toBe('string')
    })
  })
})

describe('Badge System', () => {
  const getBadges = (achievementCount: number) => {
    const badges = []
    if (achievementCount >= 50) badges.push('platinum')
    if (achievementCount >= 30) badges.push('gold')
    if (achievementCount >= 15) badges.push('silver')
    if (achievementCount >= 5) badges.push('bronze')
    return badges
  }

  it('should return correct badges for achievement counts', () => {
    expect(getBadges(0)).toEqual([])
    expect(getBadges(3)).toEqual([])
    expect(getBadges(5)).toEqual(['bronze'])
    expect(getBadges(10)).toEqual(['bronze'])
    expect(getBadges(15)).toEqual(['silver', 'bronze'])
    expect(getBadges(25)).toEqual(['silver', 'bronze'])
    expect(getBadges(30)).toEqual(['gold', 'silver', 'bronze'])
    expect(getBadges(40)).toEqual(['gold', 'silver', 'bronze'])
    expect(getBadges(50)).toEqual(['platinum', 'gold', 'silver', 'bronze'])
    expect(getBadges(100)).toEqual(['platinum', 'gold', 'silver', 'bronze'])
  })

  it('should return badges in correct order', () => {
    const badges = getBadges(60)
    expect(badges).toEqual(['platinum', 'gold', 'silver', 'bronze'])
  })
})
