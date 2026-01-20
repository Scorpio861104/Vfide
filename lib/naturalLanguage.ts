/**
 * Natural Language Command Parser
 * 
 * Parses plain English commands into structured payment intents.
 * Fully client-side - no external API required.
 * 
 * Examples:
 * - "Send Alice 100 VFIDE"
 * - "Pay @bob 50 ETH next Friday"
 * - "Split 300 VFIDE with @alice @bob @carol equally"
 * - "Send 100 VFIDE to alice.eth when ETH is above 3000"
 * - "Pay rent 1500 USDC on the 1st of every month"
 */

'use client';

// ============================================================================
// Types
// ============================================================================

export interface ParsedIntent {
  type: 'send' | 'split' | 'request' | 'schedule' | 'stream' | 'conditional' | 'unknown';
  confidence: number; // 0-1
  recipients: Recipient[];
  amount?: number;
  token?: string;
  schedule?: ScheduleInfo;
  condition?: ConditionInfo;
  stream?: StreamInfo;
  rawInput: string;
  suggestions?: string[];
}

export interface Recipient {
  identifier: string; // Address, ENS, or username
  type: 'address' | 'ens' | 'username';
  share?: number; // For splits (percentage or amount)
}

export interface ScheduleInfo {
  type: 'once' | 'recurring';
  date?: Date;
  recurrence?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  dayOfMonth?: number;
  dayOfWeek?: number; // 0-6
  time?: string; // HH:MM
  endDate?: Date;
}

export interface ConditionInfo {
  type: 'price' | 'time' | 'event' | 'approval';
  asset?: string;
  operator?: 'above' | 'below' | 'equals';
  value?: number;
  description?: string;
}

export interface StreamInfo {
  ratePerSecond: number;
  duration: number; // seconds
  startTime?: Date;
}

// ============================================================================
// Token Patterns
// ============================================================================

const TOKENS = ['vfide', 'eth', 'usdc', 'usdt', 'dai', 'weth', 'wbtc', 'matic', 'bnb'];
const TOKEN_PATTERN = new RegExp(`\\b(${TOKENS.join('|')})\\b`, 'i');

const AMOUNT_PATTERN = /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:k|m|b)?/i;
const ADDRESS_PATTERN = /0x[a-fA-F0-9]{40}/;
const ENS_PATTERN = /[\w-]+\.eth/i;
const USERNAME_PATTERN = /@([\w-]+)/g;

// ============================================================================
// Time Parsing
// ============================================================================

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const _MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function parseRelativeDate(text: string): Date | undefined {
  const now = new Date();
  const lowerText = text.toLowerCase();

  // Today/Tomorrow
  if (lowerText.includes('today')) {
    return now;
  }
  if (lowerText.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  // Next [day]
  const nextDayMatch = lowerText.match(/next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i);
  if (nextDayMatch && nextDayMatch[1]) {
    const targetDay = DAY_NAMES.indexOf(nextDayMatch[1].toLowerCase());
    const result = new Date(now);
    const currentDay = result.getDay();
    const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
    result.setDate(result.getDate() + daysUntil);
    return result;
  }

  // In X days/weeks/months
  const inMatch = lowerText.match(/in\s+(\d+)\s+(day|week|month|year)s?/i);
  if (inMatch && inMatch[1] && inMatch[2]) {
    const amount = parseInt(inMatch[1], 10);
    if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
      return undefined;
    }
    
    const unit = inMatch[2].toLowerCase();
    const result = new Date(now);
    
    switch (unit) {
      case 'day':
        result.setDate(result.getDate() + amount);
        break;
      case 'week':
        result.setDate(result.getDate() + amount * 7);
        break;
      case 'month':
        result.setMonth(result.getMonth() + amount);
        break;
      case 'year':
        result.setFullYear(result.getFullYear() + amount);
        break;
    }
    return result;
  }

  // On the Xth (day of month for recurring)
  const dayOfMonthMatch = lowerText.match(/on\s+the\s+(\d+)(?:st|nd|rd|th)/i);
  if (dayOfMonthMatch && dayOfMonthMatch[1]) {
    const day = parseInt(dayOfMonthMatch[1], 10);
    if (isNaN(day) || !isFinite(day) || day < 1 || day > 31) {
      return undefined;
    }
    
    const result = new Date(now);
    result.setDate(day);
    if (result <= now) {
      result.setMonth(result.getMonth() + 1);
    }
    return result;
  }

  // Specific date: Jan 15, January 15, 1/15, etc.
  const monthDayMatch = lowerText.match(/(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})|(\d{1,2})\/(\d{1,2}))/i);
  if (monthDayMatch) {
    const result = new Date(now);
    let month: number;
    let day: number;

    if (monthDayMatch[1] && monthDayMatch[2]) {
      // Month name format
      const monthName = monthDayMatch[1].toLowerCase().slice(0, 3);
      month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(monthName);
      day = parseInt(monthDayMatch[2], 10);
      
      if (isNaN(day) || !isFinite(day) || day < 1 || day > 31) {
        return undefined;
      }
    } else if (monthDayMatch[3] && monthDayMatch[4]) {
      // MM/DD format
      month = parseInt(monthDayMatch[3], 10) - 1;
      day = parseInt(monthDayMatch[4], 10);
      
      if (isNaN(month) || isNaN(day) || !isFinite(month) || !isFinite(day) || 
          month < 0 || month > 11 || day < 1 || day > 31) {
        return undefined;
      }
    } else {
      return undefined;
    }

    result.setMonth(month);
    result.setDate(day);
    if (result <= now) {
      result.setFullYear(result.getFullYear() + 1);
    }
    return result;
  }

  return undefined;
}

function parseRecurrence(text: string): ScheduleInfo['recurrence'] | undefined {
  const lower = text.toLowerCase();
  
  if (lower.includes('every day') || lower.includes('daily')) return 'daily';
  if (lower.includes('every week') || lower.includes('weekly')) return 'weekly';
  if (lower.includes('every two weeks') || lower.includes('biweekly') || lower.includes('bi-weekly')) return 'biweekly';
  if (lower.includes('every month') || lower.includes('monthly')) return 'monthly';
  if (lower.includes('every year') || lower.includes('yearly') || lower.includes('annually')) return 'yearly';
  
  return undefined;
}

// ============================================================================
// Condition Parsing
// ============================================================================

function parseCondition(text: string): ConditionInfo | undefined {
  const lower = text.toLowerCase();

  // Price condition: "when ETH is above 3000"
  const priceMatch = lower.match(/when\s+(\w+)\s+(?:is\s+)?(above|below|over|under|at|equals?)\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)/i);
  if (priceMatch && priceMatch[1] && priceMatch[2] && priceMatch[3]) {
    const asset = priceMatch[1].toUpperCase();
    let operator: ConditionInfo['operator'] = 'above';
    
    if (['below', 'under'].includes(priceMatch[2].toLowerCase())) {
      operator = 'below';
    } else if (['at', 'equal', 'equals'].includes(priceMatch[2].toLowerCase())) {
      operator = 'equals';
    }

    return {
      type: 'price',
      asset,
      operator,
      value: parseFloat(priceMatch[3].replace(/,/g, '')),
      description: `When ${asset} is ${operator} $${priceMatch[3]}`,
    };
  }

  // Approval condition: "when approved by @alice"
  const approvalMatch = lower.match(/when\s+approved\s+by\s+(@\w+|[\w-]+\.eth|0x[a-f0-9]{40})/i);
  if (approvalMatch) {
    return {
      type: 'approval',
      description: `When approved by ${approvalMatch[1]}`,
    };
  }

  // Event condition: "when package delivered", "when milestone complete"
  const eventMatch = lower.match(/when\s+(.+?)(?:\s+(?:send|pay|release|transfer))?$/i);
  if (eventMatch && eventMatch[1] && !priceMatch && !approvalMatch) {
    return {
      type: 'event',
      description: eventMatch[1].trim(),
    };
  }

  return undefined;
}

// ============================================================================
// Stream Parsing
// ============================================================================

function parseStream(text: string): StreamInfo | undefined {
  const lower = text.toLowerCase();

  // "stream 1000 VFIDE over 30 days"
  const streamMatch = lower.match(/stream\s+.*?over\s+(\d+)\s+(second|minute|hour|day|week|month)s?/i);
  if (streamMatch && streamMatch[1] && streamMatch[2]) {
    const amount = parseInt(streamMatch[1], 10);
    if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
      return undefined;
    }
    
    const unit = streamMatch[2].toLowerCase();
    
    let durationSeconds: number;
    switch (unit) {
      case 'second': durationSeconds = amount; break;
      case 'minute': durationSeconds = amount * 60; break;
      case 'hour': durationSeconds = amount * 3600; break;
      case 'day': durationSeconds = amount * 86400; break;
      case 'week': durationSeconds = amount * 604800; break;
      case 'month': durationSeconds = amount * 2592000; break;
      default: durationSeconds = amount * 86400;
    }

    return {
      ratePerSecond: 0, // Will be calculated with amount
      duration: durationSeconds,
    };
  }

  // "pay per second/minute/hour"
  if (lower.includes('per second') || lower.includes('per minute') || lower.includes('per hour')) {
    return {
      ratePerSecond: 0,
      duration: 0, // Indefinite
    };
  }

  return undefined;
}

// ============================================================================
// Main Parser
// ============================================================================

export function parseNaturalLanguage(input: string): ParsedIntent {
  const result: ParsedIntent = {
    type: 'unknown',
    confidence: 0,
    recipients: [],
    rawInput: input,
  };

  const lower = input.toLowerCase().trim();

  // Extract recipients
  const recipients: Recipient[] = [];

  // Ethereum addresses
  const addressMatches = input.match(new RegExp(ADDRESS_PATTERN, 'g'));
  if (addressMatches) {
    addressMatches.forEach(addr => {
      recipients.push({ identifier: addr, type: 'address' });
    });
  }

  // ENS names
  const ensMatches = input.match(new RegExp(ENS_PATTERN, 'gi'));
  if (ensMatches) {
    ensMatches.forEach(ens => {
      recipients.push({ identifier: ens.toLowerCase(), type: 'ens' });
    });
  }

  // @usernames
  let usernameMatch;
  const usernameRegex = new RegExp(USERNAME_PATTERN);
  while ((usernameMatch = usernameRegex.exec(input)) !== null) {
    if (usernameMatch[1]) {
      recipients.push({ identifier: usernameMatch[1], type: 'username' });
    }
  }

  // Also check for common name patterns like "to Alice", "with Bob"
  const nameMatch = lower.match(/(?:to|with|pay|send)\s+([a-z]+)(?:\s|$)/i);
  if (nameMatch && nameMatch[1] && !recipients.length) {
    const potentialName = nameMatch[1];
    // Filter out common words
    if (!['the', 'a', 'an', 'my', 'me', 'them', 'everyone'].includes(potentialName)) {
      recipients.push({ identifier: potentialName, type: 'username' });
    }
  }

  result.recipients = recipients;

  // Extract amount
  const amountMatch = input.match(AMOUNT_PATTERN);
  if (amountMatch && amountMatch[1]) {
    let amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    const suffix = amountMatch[0].toLowerCase();
    if (suffix.endsWith('k')) amount *= 1000;
    if (suffix.endsWith('m')) amount *= 1000000;
    if (suffix.endsWith('b')) amount *= 1000000000;
    result.amount = amount;
  }

  // Extract token
  const tokenMatch = input.match(TOKEN_PATTERN);
  if (tokenMatch && tokenMatch[1]) {
    result.token = tokenMatch[1].toUpperCase();
  } else {
    result.token = 'VFIDE'; // Default
  }

  // Determine intent type
  if (lower.includes('stream') || lower.includes('per second') || lower.includes('per minute')) {
    result.type = 'stream';
    result.stream = parseStream(input);
    if (result.stream && result.amount) {
      result.stream.ratePerSecond = result.amount / (result.stream.duration || 1);
    }
    result.confidence = 0.85;
  } else if (lower.includes('split') || (lower.includes('with') && recipients.length > 1)) {
    result.type = 'split';
    // Calculate equal shares
    if (result.amount && recipients.length > 0) {
      const shareAmount = result.amount / recipients.length;
      result.recipients = recipients.map(r => ({ ...r, share: shareAmount }));
    }
    result.confidence = 0.9;
  } else if (lower.includes('when ')) {
    result.type = 'conditional';
    result.condition = parseCondition(input);
    result.confidence = result.condition ? 0.85 : 0.5;
  } else if (lower.includes('every ') || lower.includes('monthly') || lower.includes('weekly') || lower.includes('on the')) {
    result.type = 'schedule';
    const recurrence = parseRecurrence(input);
    const date = parseRelativeDate(input);
    result.schedule = {
      type: recurrence ? 'recurring' : 'once',
      recurrence,
      date,
    };
    
    // Extract day of month for recurring
    const dayMatch = lower.match(/on\s+the\s+(\d+)(?:st|nd|rd|th)/);
    if (dayMatch && dayMatch[1]) {
      const dayValue = parseInt(dayMatch[1], 10);
      if (!isNaN(dayValue) && isFinite(dayValue) && dayValue >= 1 && dayValue <= 31) {
        result.schedule.dayOfMonth = dayValue;
      }
    }
    
    result.confidence = 0.85;
  } else if (lower.includes('request') || lower.includes('ask for') || lower.includes('invoice')) {
    result.type = 'request';
    result.confidence = 0.9;
  } else if (lower.includes('send') || lower.includes('pay') || lower.includes('transfer')) {
    result.type = 'send';
    result.confidence = 0.9;
  }

  // Add scheduling if date mentioned but not primary intent
  if (result.type !== 'schedule' && !result.schedule) {
    const date = parseRelativeDate(input);
    if (date && date > new Date()) {
      result.schedule = { type: 'once', date };
    }
  }

  // Generate suggestions for ambiguous intents
  if (result.confidence < 0.7 || result.type === 'unknown') {
    result.suggestions = generateSuggestions(input, result);
  }

  return result;
}

function generateSuggestions(input: string, partial: ParsedIntent): string[] {
  const suggestions: string[] = [];

  if (!partial.recipients.length) {
    suggestions.push('Try adding a recipient: "Send 100 VFIDE to @alice" or "Pay bob.eth 50 ETH"');
  }

  if (!partial.amount) {
    suggestions.push('Try specifying an amount: "Send 100 VFIDE" or "Pay 0.5 ETH"');
  }

  if (input.toLowerCase().includes('split') && partial.recipients.length < 2) {
    suggestions.push('For splits, add multiple recipients: "Split 300 with @alice @bob @carol"');
  }

  return suggestions;
}

// ============================================================================
// Intent Executor
// ============================================================================

export interface ExecutionPlan {
  steps: ExecutionStep[];
  estimatedGas?: bigint;
  warnings?: string[];
}

export interface ExecutionStep {
  id: string;
  type: 'approve' | 'send' | 'schedule' | 'createStream' | 'createEscrow';
  description: string;
  params: Record<string, unknown>;
  dependsOn?: string[];
}

export function createExecutionPlan(intent: ParsedIntent): ExecutionPlan {
  const steps: ExecutionStep[] = [];
  const warnings: string[] = [];

  switch (intent.type) {
    case 'send':
      intent.recipients.forEach((recipient, idx) => {
        steps.push({
          id: `send-${idx}`,
          type: 'send',
          description: `Send ${intent.amount} ${intent.token} to ${recipient.identifier}`,
          params: {
            to: recipient.identifier,
            amount: intent.amount,
            token: intent.token,
          },
        });
      });
      break;

    case 'split':
      intent.recipients.forEach((recipient, idx) => {
        steps.push({
          id: `split-${idx}`,
          type: 'send',
          description: `Send ${recipient.share} ${intent.token} to ${recipient.identifier}`,
          params: {
            to: recipient.identifier,
            amount: recipient.share,
            token: intent.token,
          },
        });
      });
      break;

    case 'stream':
      if (intent.stream && intent.recipients.length > 0) {
        const streamRecipient = intent.recipients[0];
        if (streamRecipient) {
          steps.push({
            id: 'approve-stream',
            type: 'approve',
            description: `Approve ${intent.amount} ${intent.token} for streaming`,
            params: { amount: intent.amount, token: intent.token },
          });
          steps.push({
            id: 'create-stream',
            type: 'createStream',
            description: `Create payment stream: ${intent.stream.ratePerSecond.toFixed(6)} ${intent.token}/second for ${intent.stream.duration}s`,
            params: {
              recipient: streamRecipient.identifier,
              totalAmount: intent.amount,
              duration: intent.stream.duration,
              token: intent.token,
            },
            dependsOn: ['approve-stream'],
          });
        }
      }
      break;

    case 'conditional':
      if (intent.condition && intent.recipients.length > 0) {
        const conditionalRecipient = intent.recipients[0];
        if (conditionalRecipient) {
          steps.push({
            id: 'create-escrow',
            type: 'createEscrow',
            description: `Create conditional escrow: ${intent.amount} ${intent.token} - ${intent.condition.description}`,
            params: {
              recipient: conditionalRecipient.identifier,
              amount: intent.amount,
              token: intent.token,
              condition: intent.condition,
            },
          });
        }
      }
      break;

    case 'schedule':
      if (intent.schedule) {
        intent.recipients.forEach((recipient, idx) => {
          steps.push({
            id: `schedule-${idx}`,
            type: 'schedule',
            description: intent.schedule?.recurrence
              ? `Schedule ${intent.schedule.recurrence} payment of ${intent.amount} ${intent.token} to ${recipient.identifier}`
              : `Schedule payment of ${intent.amount} ${intent.token} to ${recipient.identifier} on ${intent.schedule?.date?.toLocaleDateString()}`,
            params: {
              to: recipient.identifier,
              amount: intent.amount,
              token: intent.token,
              schedule: intent.schedule,
            },
          });
        });
      }
      break;
  }

  // Add warnings
  if (intent.confidence < 0.7) {
    warnings.push('Low confidence in parsing. Please verify the transaction details.');
  }

  if (intent.recipients.some(r => r.type === 'username')) {
    warnings.push('Username recipients need to be resolved to addresses.');
  }

  return { steps, warnings };
}

// ============================================================================
// React Hook
// ============================================================================

import { useState, useCallback } from 'react';

export function useNaturalLanguage() {
  const [input, setInput] = useState('');
  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);

  const parse = useCallback((text: string) => {
    setInput(text);
    const parsed = parseNaturalLanguage(text);
    setIntent(parsed);
    
    if (parsed.type !== 'unknown' && parsed.confidence >= 0.5) {
      setPlan(createExecutionPlan(parsed));
    } else {
      setPlan(null);
    }
    
    return parsed;
  }, []);

  const clear = useCallback(() => {
    setInput('');
    setIntent(null);
    setPlan(null);
  }, []);

  return {
    input,
    intent,
    plan,
    parse,
    clear,
    setInput,
  };
}

export default parseNaturalLanguage;
