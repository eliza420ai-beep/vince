interface SkillData {
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  category: 'trading' | 'dev' | 'lifestyle' | 'creative';
  lastActivity: Date;
  streak: number;
}

interface LeaderboardEntry {
  rank: number;
  user: string;
  totalXP: number;
  topSkills: SkillData[];
  badges: string[];
}

class ClawHubSkillLeaderboard {
  private skills: Map<string, SkillData[]> = new Map();
  
  constructor() {
    this.seedData();
  }

  addSkillXP(user: string, skillName: string, xp: number, category: SkillData['category']) {
    if (!this.skills.has(user)) {
      this.skills.set(user, []);
    }
    
    const userSkills = this.skills.get(user)!;
    const skill = userSkills.find(s => s.name === skillName);
    
    if (skill) {
      skill.xp += xp;
      skill.level = Math.floor(skill.xp / 1000) + 1;
      skill.xpToNext = (skill.level * 1000) - skill.xp;
      skill.lastActivity = new Date();
      skill.streak++;
    } else {
      userSkills.push({
        name: skillName,
        level: Math.floor(xp / 1000) + 1,
        xp,
        xpToNext: 1000 - (xp % 1000),
        category,
        lastActivity: new Date(),
        streak: 1
      });
    }
  }

  getLeaderboard(limit = 10): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];
    
    for (const [user, userSkills] of this.skills) {
      const totalXP = userSkills.reduce((sum, skill) => sum + skill.xp, 0);
      const topSkills = userSkills
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 3);
      
      const badges = this.calculateBadges(userSkills);
      
      entries.push({
        rank: 0,
        user,
        totalXP,
        topSkills,
        badges
      });
    }
    
    entries.sort((a, b) => b.totalXP - a.totalXP);
    entries.forEach((entry, index) => entry.rank = index + 1);
    
    return entries.slice(0, limit);
  }

  private calculateBadges(skills: SkillData[]): string[] {
    const badges: string[] = [];
    
    if (skills.some(s => s.level >= 10)) badges.push('🏆 Expert');
    if (skills.some(s => s.streak >= 7)) badges.push('🔥 Hot Streak');
    if (skills.filter(s => s.level >= 5).length >= 3) badges.push('🌟 Polymath');
    if (skills.some(s => s.category === 'trading' && s.level >= 8)) badges.push('📈 Alpha Hunter');
    if (skills.some(s => s.category === 'lifestyle' && s.level >= 6)) badges.push('🍷 Connoisseur');
    
    return badges;
  }

  private seedData() {
    this.addSkillXP('LiveTheLifeTV', 'Options Trading', 8500, 'trading');
    this.addSkillXP('LiveTheLifeTV', 'Wine Tasting', 6200, 'lifestyle');
    this.addSkillXP('LiveTheLifeTV', 'TypeScript', 7800, 'dev');
    
    this.addSkillXP('SatoshiSurfer', 'Perp Trading', 9200, 'trading');
    this.addSkillXP('SatoshiSurfer', 'Surfing', 12000, 'lifestyle');
    this.addSkillXP('SatoshiSurfer', 'Photography', 4500, 'creative');
    
    this.addSkillXP('GrokAlpha', 'Market Analysis', 11500, 'trading');
    this.addSkillXP('GrokAlpha', 'Python', 8900, 'dev');
    this.addSkillXP('GrokAlpha', 'Yoga', 3200, 'lifestyle');
  }

  renderLeaderboard(): string {
    const entries = this.getLeaderboard();
    let output = '🏆 CLAWHUB SKILL LEADERBOARD\n\n';
    
    entries.forEach(entry => {
      output += `${entry.rank}. ${entry.user} (${entry.totalXP.toLocaleString()} XP)\n`;
      output += `   Top Skills: ${entry.topSkills.map(s => `${s.name} L${s.level}`).join(', ')}\n`;
      if (entry.badges.length) output += `   ${entry.badges.join(' ')}\n`;
      output += '\n';
    });
    
    return output;
  }
}

export default ClawHubSkillLeaderboard;