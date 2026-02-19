import { TwitterApi } from 'twitter-api-v2';

interface SentimentData {
  timestamp: number;
  tweet: string;
  author: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  engagement: number;
}

interface CTSentimentMonitor {
  trackKeywords: string[];
  sentimentHistory: SentimentData[];
  getCurrentSentiment(): Promise<{ overall: string; confidence: number; sample: SentimentData[] }>;
}

export class CTSentimentMonitor implements CTSentimentMonitor {
  trackKeywords = [
    '$BTC', '$ETH', 'bitcoin', 'ethereum', 'crypto', 'altseason',
    'bull market', 'bear market', 'moon', 'dump', 'pump', 'rekt',
    'diamond hands', 'paper hands', 'HODL', 'DeFi', 'NFT', 'web3'
  ];
  
  sentimentHistory: SentimentData[] = [];
  private twitterClient: TwitterApi;
  
  constructor(bearerToken: string) {
    this.twitterClient = new TwitterApi(bearerToken);
  }
  
  private analyzeSentiment(text: string): { sentiment: 'bullish' | 'bearish' | 'neutral'; confidence: number } {
    const bullishTerms = ['moon', 'pump', 'bullish', 'buy', 'long', 'diamond hands', 'HODL', 'rocket', '🚀', '📈', 'green', 'up only'];
    const bearishTerms = ['dump', 'bearish', 'sell', 'short', 'paper hands', 'rekt', 'crash', 'red', '📉', 'down bad', 'capitulation'];
    
    const lowerText = text.toLowerCase();
    let bullishScore = 0;
    let bearishScore = 0;
    
    bullishTerms.forEach(term => {
      const matches = (lowerText.match(new RegExp(term, 'g')) || []).length;
      bullishScore += matches;
    });
    
    bearishTerms.forEach(term => {
      const matches = (lowerText.match(new RegExp(term, 'g')) || []).length;
      bearishScore += matches;
    });
    
    const totalScore = bullishScore + bearishScore;
    if (totalScore === 0) return { sentiment: 'neutral', confidence: 0.1 };
    
    const confidence = Math.min(totalScore / 5, 1);
    
    if (bullishScore > bearishScore) {
      return { sentiment: 'bullish', confidence };
    } else if (bearishScore > bullishScore) {
      return { sentiment: 'bearish', confidence };
    } else {
      return { sentiment: 'neutral', confidence: confidence * 0.5 };
    }
  }
  
  private calculateEngagement(tweet: any): number {
    const retweets = tweet.public_metrics?.retweet_count || 0;
    const likes = tweet.public_metrics?.like_count || 0;
    const replies = tweet.public_metrics?.reply_count || 0;
    
    return retweets * 3 + likes + replies * 2;
  }
  
  async getCurrentSentiment(): Promise<{ overall: string; confidence: number; sample: SentimentData[] }> {
    try {
      const searchQuery = this.trackKeywords.slice(0, 5).join(' OR ');
      const tweets = await this.twitterClient.v2.search(searchQuery, {
        max_results: 100,
        'tweet.fields': ['public_metrics', 'created_at', 'author_id'],
        'user.fields': ['username']
      });
      
      const sentimentData: SentimentData[] = [];
      
      for (const tweet of tweets.data || []) {
        const { sentiment, confidence } = this.analyzeSentiment(tweet.text);
        const engagement = this.calculateEngagement(tweet);
        
        sentimentData.push({
          timestamp: Date.now(),
          tweet: tweet.text.substring(0, 100),
          author: tweet.author_id || 'unknown',
          sentiment,
          confidence,
          engagement
        });
      }
      
      this.sentimentHistory = [...this.sentimentHistory, ...sentimentData].slice(-1000);
      
      const recent = sentimentData.slice(-50);
      const bullishCount = recent.filter(d => d.sentiment === 'bullish').length;
      const bearishCount = recent.filter(d => d.sentiment === 'bearish').length;
      const neutralCount = recent.filter(d => d.sentiment === 'neutral').length;
      
      const total = recent.length;
      const bullishRatio = bullishCount / total;
      const bearishRatio = bearishCount / total;
      
      let overall: string;
      let overallConfidence: number;
      
      if (bullishRatio > 0.6) {
        overall = 'strongly bullish';
        overallConfidence = bullishRatio;
      } else if (bullishRatio > 0.4) {
        overall = 'bullish';
        overallConfidence = bullishRatio * 0.8;
      } else if (bearishRatio > 0.6) {
        overall = 'strongly bearish';
        overallConfidence = bearishRatio;
      } else if (bearishRatio > 0.4) {
        overall = 'bearish';
        overallConfidence = bearishRatio * 0.8;
      } else {
        overall = 'neutral';
        overallConfidence = Math.max(neutralCount / total, 0.3);
      }
      
      return {
        overall,
        confidence: overallConfidence,
        sample: recent.slice(0, 10)
      };
      
    } catch (error) {
      console.error('CT Sentiment Monitor error:', error);
      return { overall: 'neutral', confidence: 0, sample: [] };
    }
  }
}