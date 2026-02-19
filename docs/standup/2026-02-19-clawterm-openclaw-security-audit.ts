interface SecurityRule {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  check: (codebase: string[]) => SecurityIssue[];
}

interface SecurityIssue {
  rule: string;
  file: string;
  line: number;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

const SECURITY_RULES: SecurityRule[] = [
  {
    id: 'hardcoded-secrets',
    name: 'Hardcoded Secrets',
    severity: 'critical',
    check: (files) => {
      const issues: SecurityIssue[] = [];
      const secretPatterns = [
        /api[_-]?key\s*[:=]\s*['"][^'"]{8,}/i,
        /secret[_-]?key\s*[:=]\s*['"][^'"]{8,}/i,
        /password\s*[:=]\s*['"][^'"]+/i,
        /token\s*[:=]\s*['"][^'"]{20,}/i,
        /sk-[a-zA-Z0-9]{48}/g, // OpenAI API key pattern
      ];
      
      files.forEach((content, index) => {
        const lines = content.split('\n');
        lines.forEach((line, lineNum) => {
          secretPatterns.forEach(pattern => {
            if (pattern.test(line)) {
              issues.push({
                rule: 'hardcoded-secrets',
                file: `file-${index}`,
                line: lineNum + 1,
                message: 'Potential hardcoded secret detected',
                severity: 'critical'
              });
            }
          });
        });
      });
      
      return issues;
    }
  },
  {
    id: 'unsafe-eval',
    name: 'Unsafe eval() Usage',
    severity: 'high',
    check: (files) => {
      const issues: SecurityIssue[] = [];
      const evalPattern = /\beval\s*\(/g;
      
      files.forEach((content, index) => {
        const lines = content.split('\n');
        lines.forEach((line, lineNum) => {
          if (evalPattern.test(line)) {
            issues.push({
              rule: 'unsafe-eval',
              file: `file-${index}`,
              line: lineNum + 1,
              message: 'Use of eval() detected - potential code injection risk',
              severity: 'high'
            });
          }
        });
      });
      
      return issues;
    }
  },
  {
    id: 'console-logs',
    name: 'Console Logs in Production',
    severity: 'medium',
    check: (files) => {
      const issues: SecurityIssue[] = [];
      const consolePattern = /console\.(log|debug|info|warn|error)\s*\(/g;
      
      files.forEach((content, index) => {
        const lines = content.split('\n');
        lines.forEach((line, lineNum) => {
          if (consolePattern.test(line)) {
            issues.push({
              rule: 'console-logs',
              file: `file-${index}`,
              line: lineNum + 1,
              message: 'Console statement found - may leak sensitive information',
              severity: 'medium'
            });
          }
        });
      });
      
      return issues;
    }
  },
  {
    id: 'sql-injection',
    name: 'Potential SQL Injection',
    severity: 'high',
    check: (files) => {
      const issues: SecurityIssue[] = [];
      const sqlPattern = /(SELECT|INSERT|UPDATE|DELETE).*\+.*['"`]/gi;
      
      files.forEach((content, index) => {
        const lines = content.split('\n');
        lines.forEach((line, lineNum) => {
          if (sqlPattern.test(line)) {
            issues.push({
              rule: 'sql-injection',
              file: `file-${index}`,
              line: lineNum + 1,
              message: 'Potential SQL injection vulnerability - use parameterized queries',
              severity: 'high'
            });
          }
        });
      });
      
      return issues;
    }
  }
];

export class OpenClawSecurityAudit {
  private rules: SecurityRule[] = SECURITY_RULES;

  audit(codebase: string[]): SecurityIssue[] {
    const allIssues: SecurityIssue[] = [];
    
    this.rules.forEach(rule => {
      const issues = rule.check(codebase);
      allIssues.push(...issues);
    });
    
    return allIssues.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  generateReport(issues: SecurityIssue[]): string {
    if (issues.length === 0) {
      return 'OpenClaw Security Audit: No security issues found.';
    }

    const summary = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let report = `OpenClaw Security Audit Report\n${'='.repeat(35)}\n\n`;
    report += `Summary: ${issues.length} issues found\n`;
    report += `Critical: ${summary.critical || 0}, High: ${summary.high || 0}, Medium: ${summary.medium || 0}, Low: ${summary.low || 0}\n\n`;
    
    issues.forEach(issue => {
      report += `[${issue.severity.toUpperCase()}] ${issue.file}:${issue.line}\n`;
      report += `  ${issue.message}\n\n`;
    });

    return report;
  }
}