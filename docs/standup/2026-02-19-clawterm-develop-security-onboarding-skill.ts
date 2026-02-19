interface SecurityRule {
  id: string;
  category: 'access' | 'data' | 'network' | 'device' | 'social';
  rule: string;
  rationale: string;
  enforcement: 'mandatory' | 'recommended' | 'contextual';
}

interface OnboardingStep {
  step: number;
  title: string;
  description: string;
  rules: SecurityRule[];
  verification: string;
  timeEstimate: string;
}

class SecurityOnboarding {
  private steps: OnboardingStep[] = [
    {
      step: 1,
      title: "Access Control Foundation",
      description: "Establish secure authentication and authorization",
      rules: [
        {
          id: "auth-001",
          category: "access",
          rule: "Enable 2FA on all accounts",
          rationale: "Prevents 90% of account takeovers",
          enforcement: "mandatory"
        },
        {
          id: "auth-002", 
          category: "access",
          rule: "Use unique passwords via password manager",
          rationale: "Eliminates credential reuse attacks",
          enforcement: "mandatory"
        }
      ],
      verification: "Screenshot of 2FA setup + password manager confirmation",
      timeEstimate: "15 minutes"
    },
    {
      step: 2,
      title: "Data Protection Basics",
      description: "Secure data handling and storage practices",
      rules: [
        {
          id: "data-001",
          category: "data",
          rule: "Encrypt sensitive data at rest and in transit",
          rationale: "Protects against data breaches and interception",
          enforcement: "mandatory"
        },
        {
          id: "data-002",
          category: "data",
          rule: "Follow principle of least privilege",
          rationale: "Limits blast radius of security incidents",
          enforcement: "mandatory"
        }
      ],
      verification: "Confirm encryption tools installed and configured",
      timeEstimate: "20 minutes"
    },
    {
      step: 3,
      title: "Network Security Essentials",
      description: "Secure network connections and communications",
      rules: [
        {
          id: "network-001",
          category: "network",
          rule: "Use VPN for remote work",
          rationale: "Encrypts traffic and masks location",
          enforcement: "mandatory"
        },
        {
          id: "network-002",
          category: "network",
          rule: "Verify SSL certificates before entering credentials",
          rationale: "Prevents man-in-the-middle attacks",
          enforcement: "recommended"
        }
      ],
      verification: "VPN connection test + SSL verification demo",
      timeEstimate: "10 minutes"
    }
  ];

  getOnboardingPlan(): OnboardingStep[] {
    return this.steps;
  }

  getStepByNumber(stepNumber: number): OnboardingStep | null {
    return this.steps.find(step => step.step === stepNumber) || null;
  }

  getRulesByCategory(category: SecurityRule['category']): SecurityRule[] {
    return this.steps
      .flatMap(step => step.rules)
      .filter(rule => rule.category === category);
  }

  getMandatoryRules(): SecurityRule[] {
    return this.steps
      .flatMap(step => step.rules)
      .filter(rule => rule.enforcement === 'mandatory');
  }

  getTotalEstimatedTime(): string {
    const totalMinutes = this.steps
      .map(step => parseInt(step.timeEstimate.split(' ')[0]))
      .reduce((sum, minutes) => sum + minutes, 0);
    return `${totalMinutes} minutes`;
  }

  generateChecklistMarkdown(): string {
    let markdown = "# Security Onboarding Checklist\n\n";
    
    this.steps.forEach(step => {
      markdown += `## Step ${step.step}: ${step.title}\n`;
      markdown += `**Time:** ${step.timeEstimate}\n\n`;
      markdown += `${step.description}\n\n`;
      
      step.rules.forEach(rule => {
        const priority = rule.enforcement === 'mandatory' ? '🔴' : '🟡';
        markdown += `- ${priority} ${rule.rule}\n`;
        markdown += `  - *Why:* ${rule.rationale}\n`;
      });
      
      markdown += `\n**Verification:** ${step.verification}\n\n`;
      markdown += "---\n\n";
    });
    
    return markdown;
  }

  validateCompletion(completedRules: string[]): {
    isComplete: boolean;
    missingMandatory: SecurityRule[];
    completionRate: number;
  } {
    const mandatoryRules = this.getMandatoryRules();
    const missingMandatory = mandatoryRules.filter(
      rule => !completedRules.includes(rule.id)
    );
    
    const totalRules = this.steps.flatMap(step => step.rules).length;
    const completionRate = (completedRules.length / totalRules) * 100;
    
    return {
      isComplete: missingMandatory.length === 0,
      missingMandatory,
      completionRate: Math.round(completionRate)
    };
  }
}

export { SecurityOnboarding, SecurityRule, OnboardingStep };