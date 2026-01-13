/**
 * Natural Language Parser Tests
 */

import parseNaturalLanguage, {
  ParsedIntent,
  Recipient,
  ScheduleInfo,
  ConditionInfo,
  StreamInfo,
  ExecutionPlan,
  createExecutionPlan,
} from '../naturalLanguage';

describe('parseNaturalLanguage', () => {
  it('is a function', () => {
    expect(typeof parseNaturalLanguage).toBe('function');
  });

  it('returns ParsedIntent object', () => {
    const result = parseNaturalLanguage('send 100 ETH to alice.eth');
    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('rawInput');
  });

  it('parses simple send commands', () => {
    const result = parseNaturalLanguage('send 100 ETH to 0x1234567890123456789012345678901234567890');
    expect(result.type).toBe('send');
    expect(result.amount).toBe(100);
    expect(result.token).toBe('ETH');
  });

  it('handles unknown commands', () => {
    const result = parseNaturalLanguage('do something weird');
    expect(result.type).toBe('unknown');
    expect(result.confidence).toBeLessThan(0.5);
  });
});

describe('ParsedIntent interface', () => {
  it('defines intent structure', () => {
    const intent: ParsedIntent = {
      type: 'send',
      confidence: 0.95,
      recipients: [{ identifier: '0x123', type: 'address' }],
      amount: 100,
      token: 'ETH',
      rawInput: 'send 100 ETH to 0x123',
    };
    expect(intent.type).toBe('send');
    expect(intent.confidence).toBe(0.95);
  });

  it('supports all intent types', () => {
    const types: ParsedIntent['type'][] = ['send', 'split', 'request', 'schedule', 'stream', 'conditional', 'unknown'];
    types.forEach(type => {
      const intent: ParsedIntent = {
        type,
        confidence: 0.5,
        recipients: [],
        rawInput: 'test',
      };
      expect(intent.type).toBe(type);
    });
  });
});

describe('Recipient interface', () => {
  it('defines recipient structure', () => {
    const recipient: Recipient = {
      identifier: 'alice.eth',
      type: 'ens',
      share: 50,
    };
    expect(recipient.type).toBe('ens');
    expect(recipient.share).toBe(50);
  });

  it('supports all recipient types', () => {
    const types: Recipient['type'][] = ['address', 'ens', 'username'];
    types.forEach(type => {
      const recipient: Recipient = {
        identifier: 'test',
        type,
      };
      expect(recipient.type).toBe(type);
    });
  });
});

describe('ScheduleInfo interface', () => {
  it('defines schedule structure', () => {
    const schedule: ScheduleInfo = {
      type: 'recurring',
      recurrence: 'monthly',
      dayOfMonth: 1,
    };
    expect(schedule.recurrence).toBe('monthly');
  });
});

describe('ConditionInfo interface', () => {
  it('defines condition structure', () => {
    const condition: ConditionInfo = {
      type: 'price',
      token: 'ETH',
      operator: 'above',
      value: 3000,
    };
    expect(condition.type).toBe('price');
    expect(condition.value).toBe(3000);
  });
});

describe('StreamInfo interface', () => {
  it('defines stream structure', () => {
    const stream: StreamInfo = {
      duration: 2592000, // 30 days in seconds
      rate: 'per_second',
      startImmediate: true,
    };
    expect(stream.duration).toBe(2592000);
  });
});

describe('createExecutionPlan', () => {
  it('is a function', () => {
    expect(typeof createExecutionPlan).toBe('function');
  });

  it('creates plan from valid intent', () => {
    const intent: ParsedIntent = {
      type: 'send',
      confidence: 0.9,
      recipients: [{ identifier: '0x1234567890123456789012345678901234567890', type: 'address' }],
      amount: 100,
      token: 'ETH',
      rawInput: 'send 100 ETH',
    };
    const plan = createExecutionPlan(intent);
    expect(plan).toBeDefined();
    expect(plan.steps.length).toBeGreaterThan(0);
  });
});
