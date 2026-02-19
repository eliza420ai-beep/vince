interface SkillChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  skills: string[];
  timeEstimate: number; // minutes
  points: number;
}

interface UserProgress {
  userId: string;
  completedChallenges: string[];
  totalPoints: number;
  skillLevels: Record<string, number>;
}

class ClawHubSkillChallenge {
  private challenges: SkillChallenge[] = [
    {
      id: 'terminal-basics',
      title: 'Terminal Navigation Master',
      description: 'Navigate directories, list files, and manage permissions using only terminal commands',
      difficulty: 'beginner',
      skills: ['bash', 'linux', 'file-system'],
      timeEstimate: 30,
      points: 100
    },
    {
      id: 'git-workflow',
      title: 'Git Flow Ninja',
      description: 'Create branches, handle merges, resolve conflicts, and maintain clean commit history',
      difficulty: 'intermediate',
      skills: ['git', 'version-control', 'collaboration'],
      timeEstimate: 45,
      points: 200
    },
    {
      id: 'docker-deploy',
      title: 'Container Orchestrator',
      description: 'Build multi-stage Docker images, compose services, and optimize for production',
      difficulty: 'advanced',
      skills: ['docker', 'containerization', 'devops'],
      timeEstimate: 90,
      points: 300
    },
    {
      id: 'api-design',
      title: 'REST API Architect',
      description: 'Design scalable APIs with proper authentication, rate limiting, and documentation',
      difficulty: 'intermediate',
      skills: ['api-design', 'http', 'authentication'],
      timeEstimate: 60,
      points: 250
    },
    {
      id: 'security-audit',
      title: 'Security Sentinel',
      description: 'Identify vulnerabilities, implement security headers, and secure data transmission',
      difficulty: 'advanced',
      skills: ['security', 'encryption', 'vulnerability-assessment'],
      timeEstimate: 120,
      points: 400
    }
  ];

  private userProgress: Map<string, UserProgress> = new Map();

  getChallengesByDifficulty(difficulty: SkillChallenge['difficulty']): SkillChallenge[] {
    return this.challenges.filter(c => c.difficulty === difficulty);
  }

  getChallengesBySkill(skill: string): SkillChallenge[] {
    return this.challenges.filter(c => c.skills.includes(skill));
  }

  getRecommendedChallenges(userId: string): SkillChallenge[] {
    const progress = this.userProgress.get(userId);
    if (!progress) return this.getChallengesByDifficulty('beginner');

    const completed = new Set(progress.completedChallenges);
    const available = this.challenges.filter(c => !completed.has(c.id));

    // Recommend based on skill gaps and current level
    const skillCounts = Object.keys(progress.skillLevels).length;
    if (skillCounts < 3) return available.filter(c => c.difficulty === 'beginner');
    if (skillCounts < 6) return available.filter(c => c.difficulty === 'intermediate');
    return available.filter(c => c.difficulty === 'advanced');
  }

  completeChallenge(userId: string, challengeId: string): boolean {
    const challenge = this.challenges.find(c => c.id === challengeId);
    if (!challenge) return false;

    let progress = this.userProgress.get(userId);
    if (!progress) {
      progress = {
        userId,
        completedChallenges: [],
        totalPoints: 0,
        skillLevels: {}
      };
      this.userProgress.set(userId, progress);
    }

    if (progress.completedChallenges.includes(challengeId)) return false;

    progress.completedChallenges.push(challengeId);
    progress.totalPoints += challenge.points;

    // Update skill levels
    challenge.skills.forEach(skill => {
      progress.skillLevels[skill] = (progress.skillLevels[skill] || 0) + 1;
    });

    return true;
  }

  getUserStats(userId: string) {
    const progress = this.userProgress.get(userId);
    if (!progress) return null;

    const totalChallenges = this.challenges.length;
    const completionRate = (progress.completedChallenges.length / totalChallenges) * 100;
    const topSkills = Object.entries(progress.skillLevels)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([skill, level]) => ({ skill, level }));

    return {
      ...progress,
      completionRate: Math.round(completionRate),
      topSkills,
      rank: this.getUserRank(userId)
    };
  }

  private getUserRank(userId: string): string {
    const progress = this.userProgress.get(userId);
    if (!progress) return 'Novice';

    if (progress.totalPoints >= 1000) return 'Terminal Master';
    if (progress.totalPoints >= 500) return 'Code Warrior';
    if (progress.totalPoints >= 200) return 'Script Apprentice';
    return 'Novice';
  }

  getLeaderboard(limit = 10) {
    return Array.from(this.userProgress.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit)
      .map(progress => ({
        userId: progress.userId,
        points: progress.totalPoints,
        rank: this.getUserRank(progress.userId),
        completedChallenges: progress.completedChallenges.length
      }));
  }
}

export default ClawHubSkillChallenge;