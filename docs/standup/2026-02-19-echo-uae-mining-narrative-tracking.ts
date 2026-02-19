interface MiningProject {
  name: string;
  operator: string;
  location: string;
  status: 'announced' | 'construction' | 'operational' | 'expansion';
  capacity?: string;
  announcedDate: string;
  operationalDate?: string;
  keyFeatures: string[];
  sourceUrl?: string;
}

interface NarrativeEvent {
  date: string;
  type: 'announcement' | 'partnership' | 'regulation' | 'expansion' | 'policy';
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  sourceUrl?: string;
}

class UAEMiningTracker {
  private projects: MiningProject[] = [];
  private events: NarrativeEvent[] = [];

  addProject(project: MiningProject): void {
    this.projects.push(project);
  }

  addEvent(event: NarrativeEvent): void {
    this.events.push(event);
  }

  getActiveProjects(): MiningProject[] {
    return this.projects.filter(p => 
      p.status === 'operational' || p.status === 'construction'
    );
  }

  getRecentEvents(days: number = 30): NarrativeEvent[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return this.events.filter(e => 
      new Date(e.date) >= cutoff
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getNarrativeSummary(): {
    totalProjects: number;
    operationalCapacity: string[];
    recentPositiveEvents: number;
    keyTrends: string[];
  } {
    const operational = this.projects.filter(p => p.status === 'operational');
    const recentPositive = this.getRecentEvents().filter(e => e.impact === 'positive');
    
    const trends = this.identifyTrends();
    
    return {
      totalProjects: this.projects.length,
      operationalCapacity: operational.map(p => `${p.name}: ${p.capacity || 'N/A'}`),
      recentPositiveEvents: recentPositive.length,
      keyTrends: trends
    };
  }

  private identifyTrends(): string[] {
    const trends: string[] = [];
    const recentEvents = this.getRecentEvents(90);
    
    // Government support trend
    if (recentEvents.some(e => e.type === 'policy' && e.impact === 'positive')) {
      trends.push('Increased government support for mining');
    }
    
    // Expansion trend
    const expansions = recentEvents.filter(e => e.type === 'expansion');
    if (expansions.length > 0) {
      trends.push('Active capacity expansion phase');
    }
    
    // Partnership trend
    const partnerships = recentEvents.filter(e => e.type === 'partnership');
    if (partnerships.length > 1) {
      trends.push('Strategic partnerships accelerating');
    }
    
    return trends;
  }

  exportData(): { projects: MiningProject[]; events: NarrativeEvent[]; summary: any } {
    return {
      projects: this.projects,
      events: this.events,
      summary: this.getNarrativeSummary()
    };
  }
}

// Initialize with known UAE mining projects
const tracker = new UAEMiningTracker();

// Add initial data
tracker.addProject({
  name: 'Phoenix Group Mining Facility',
  operator: 'Phoenix Group',
  location: 'Dubai',
  status: 'operational',
  capacity: '400 MW',
  announcedDate: '2023-06-15',
  operationalDate: '2024-01-10',
  keyFeatures: ['Renewable energy powered', 'Strategic Dubai location', 'Government partnership']
});

tracker.addEvent({
  date: '2024-12-15',
  type: 'policy',
  title: 'UAE announces crypto mining incentives',
  description: 'New policy framework supporting sustainable mining operations',
  impact: 'positive'
});

export default tracker;
export { UAEMiningTracker, MiningProject, NarrativeEvent };