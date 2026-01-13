/**
 * Financial Intelligence Tests
 */

import {
  FinancialHealth,
  SpendingCategory,
  TaxEvent,
  TaxSummary,
  Budget,
} from '../financialIntelligence';

describe('SpendingCategory interface', () => {
  it('defines category structure', () => {
    const category: SpendingCategory = {
      name: 'DeFi',
      amount: 1500,
      percentage: 30,
      count: 15,
      trend: 'up',
    };
    expect(category.name).toBe('DeFi');
    expect(category.percentage).toBe(30);
    expect(category.trend).toBe('up');
  });

  it('supports all trend types', () => {
    const trends: SpendingCategory['trend'][] = ['up', 'down', 'stable'];
    trends.forEach(trend => {
      const category: SpendingCategory = {
        name: 'Test',
        amount: 100,
        percentage: 10,
        count: 5,
        trend,
      };
      expect(category.trend).toBe(trend);
    });
  });
});

describe('FinancialHealth interface', () => {
  it('defines health score structure', () => {
    const health: FinancialHealth = {
      score: 85,
      grade: 'A',
      factors: {
        diversification: 90,
        stability: 80,
        growth: 85,
        risk: 75,
      },
      recommendations: ['Consider adding more stablecoins'],
    };
    expect(health.score).toBe(85);
    expect(health.grade).toBe('A');
    expect(health.factors.diversification).toBe(90);
  });

  it('supports all grade types', () => {
    const grades: FinancialHealth['grade'][] = ['A', 'B', 'C', 'D', 'F'];
    grades.forEach(grade => {
      const health: FinancialHealth = {
        score: 50,
        grade,
        factors: { diversification: 50, stability: 50, growth: 50, risk: 50 },
        recommendations: [],
      };
      expect(health.grade).toBe(grade);
    });
  });
});

describe('TaxEvent interface', () => {
  it('defines tax event structure', () => {
    const event: TaxEvent = {
      id: 'tx-1',
      date: new Date('2025-06-15'),
      type: 'sale',
      asset: 'ETH',
      amount: 2.5,
      costBasis: 5000,
      proceeds: 6250,
      gainLoss: 1250,
      isLongTerm: true,
      txHash: '0xabc123',
    };
    expect(event.gainLoss).toBe(1250);
    expect(event.isLongTerm).toBe(true);
  });

  it('supports different event types', () => {
    const types: TaxEvent['type'][] = ['sale', 'swap', 'income', 'gift'];
    types.forEach(type => {
      const event: TaxEvent = {
        id: '1',
        date: new Date(),
        type,
        asset: 'ETH',
        amount: 1,
        costBasis: 100,
        proceeds: 110,
        gainLoss: 10,
        isLongTerm: false,
        txHash: '0x123',
      };
      expect(event.type).toBe(type);
    });
  });
});

describe('TaxSummary interface', () => {
  it('defines tax summary structure', () => {
    const summary: TaxSummary = {
      year: 2025,
      shortTermGains: 5000,
      shortTermLosses: 1000,
      longTermGains: 10000,
      longTermLosses: 2000,
      totalIncome: 3000,
      estimatedTax: 4500,
      events: [],
    };
    expect(summary.year).toBe(2025);
    expect(summary.estimatedTax).toBe(4500);
  });
});

describe('Budget interface', () => {
  it('defines budget structure', () => {
    const budget: Budget = {
      id: 'budget-1',
      category: 'DeFi',
      limit: 1000,
      spent: 750,
      period: 'monthly',
      alerts: true,
    };
    expect(budget.spent).toBe(750);
    expect(budget.period).toBe('monthly');
  });

  it('supports all period types', () => {
    const periods: Budget['period'][] = ['daily', 'weekly', 'monthly'];
    periods.forEach(period => {
      const budget: Budget = {
        id: '1',
        category: 'Test',
        limit: 100,
        spent: 50,
        period,
        alerts: false,
      };
      expect(budget.period).toBe(period);
    });
  });

  it('calculates remaining budget', () => {
    const budget: Budget = {
      id: '1',
      category: 'Test',
      limit: 1000,
      spent: 750,
      period: 'monthly',
      alerts: true,
    };
    const remaining = budget.limit - budget.spent;
    expect(remaining).toBe(250);
  });

  it('calculates usage percentage', () => {
    const budget: Budget = {
      id: '1',
      category: 'Test',
      limit: 1000,
      spent: 750,
      period: 'monthly',
      alerts: true,
    };
    const percentage = (budget.spent / budget.limit) * 100;
    expect(percentage).toBe(75);
  });
});
