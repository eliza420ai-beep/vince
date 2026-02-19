import { EventEmitter } from 'events';

interface FedNomination {
  nominee: string;
  position: string;
  status: 'nominated' | 'confirmed' | 'withdrawn' | 'rejected';
  dateNominated: Date;
  dateStatusChanged?: Date;
  senateCommittee?: string;
}

interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: Date;
  content: string;
}

class FedNominationMonitor extends EventEmitter {
  private nominations: Map<string, FedNomination> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs: number = 300000; // 5 minutes

  constructor() {
    super();
  }

  async startMonitoring(): Promise<void> {
    await this.checkForUpdates();
    
    this.monitoringInterval = setInterval(async () => {
      await this.checkForUpdates();
    }, this.checkIntervalMs);
    
    this.emit('monitoring-started');
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.emit('monitoring-stopped');
  }

  private async checkForUpdates(): Promise<void> {
    try {
      const newsItems = await this.fetchFedNews();
      const nominations = await this.extractNominations(newsItems);
      
      for (const nomination of nominations) {
        this.processNomination(nomination);
      }
    } catch (error) {
      this.emit('error', error);
    }
  }

  private async fetchFedNews(): Promise<NewsItem[]> {
    const sources = [
      'https://www.federalreserve.gov/newsevents.htm',
      'https://www.senate.gov/legislative/nominations.htm'
    ];
    
    const newsItems: NewsItem[] = [];
    
    for (const source of sources) {
      try {
        const response = await fetch(source);
        const html = await response.text();
        
        // Simple extraction - in production, use proper HTML parser
        const titleRegex = /<title>(.*?)<\/title>/gi;
        const match = titleRegex.exec(html);
        
        if (match && this.isFedNominationRelated(match[1])) {
          newsItems.push({
            title: match[1],
            url: source,
            source: new URL(source).hostname,
            publishedAt: new Date(),
            content: html.substring(0, 1000)
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${source}:`, error);
      }
    }
    
    return newsItems;
  }

  private isFedNominationRelated(text: string): boolean {
    const keywords = [
      'federal reserve', 'fed', 'nomination', 'nominee', 'board of governors',
      'chair', 'vice chair', 'warsh', 'confirmation', 'senate banking'
    ];
    
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword));
  }

  private async extractNominations(newsItems: NewsItem[]): Promise<FedNomination[]> {
    const nominations: FedNomination[] = [];
    
    for (const item of newsItems) {
      const content = item.content.toLowerCase();
      
      // Look for nomination patterns
      if (content.includes('nominate') || content.includes('nomination')) {
        // Extract nominee name (simplified pattern)
        const namePattern = /(?:nominate[sd]?|nominee)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi;
        const nameMatch = namePattern.exec(item.content);
        
        if (nameMatch) {
          const nominee = nameMatch[1];
          let position = 'Board of Governors';
          
          if (content.includes('chair')) position = 'Chair';
          if (content.includes('vice chair')) position = 'Vice Chair';
          
          nominations.push({
            nominee,
            position,
            status: 'nominated',
            dateNominated: item.publishedAt,
            senateCommittee: 'Banking, Housing, and Urban Affairs'
          });
        }
      }
    }
    
    return nominations;
  }

  private processNomination(nomination: FedNomination): void {
    const key = `${nomination.nominee}-${nomination.position}`;
    const existing = this.nominations.get(key);
    
    if (!existing) {
      this.nominations.set(key, nomination);
      this.emit('new-nomination', nomination);
    } else if (existing.status !== nomination.status) {
      existing.status = nomination.status;
      existing.dateStatusChanged = new Date();
      this.emit('status-change', existing);
    }
  }

  getNominations(): FedNomination[] {
    return Array.from(this.nominations.values());
  }

  getWarshNominations(): FedNomination[] {
    return this.getNominations().filter(n => 
      n.nominee.toLowerCase().includes('warsh')
    );
  }
}

export { FedNominationMonitor, FedNomination, NewsItem };