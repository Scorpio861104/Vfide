export type SeerReasonCodeInfo = {
  code: number;
  key: string;
  category: 'autonomous' | 'guardian' | 'core' | 'unknown';
  userMeaning: string;
  whatToDo: string;
};

export const SEER_REASON_CODES: SeerReasonCodeInfo[] = [
  {
    code: 100,
    key: 'critical_score',
    category: 'autonomous',
    userMeaning: 'Your trust state is critically low for this action.',
    whatToDo: 'Pause risky actions, gather context, and submit an appeal with evidence if this is incorrect.',
  },
  {
    code: 101,
    key: 'very_low_score',
    category: 'autonomous',
    userMeaning: 'Your trust score is in a very low range for this action class.',
    whatToDo: 'Improve compliant activity and provide context in an appeal if there is a false positive.',
  },
  {
    code: 102,
    key: 'low_score',
    category: 'autonomous',
    userMeaning: 'Your score is below recommended thresholds for this operation.',
    whatToDo: 'Build score through normal protocol use and retry later or appeal with supporting detail.',
  },
  {
    code: 103,
    key: 'below_rate_threshold',
    category: 'autonomous',
    userMeaning: 'Rate threshold controls were triggered for your current trust state.',
    whatToDo: 'Reduce action frequency and avoid burst behavior until limits reset.',
  },
  {
    code: 120,
    key: 'repeated_pattern_violation',
    category: 'autonomous',
    userMeaning: 'Repeated suspicious patterns were detected.',
    whatToDo: 'Stop automation-like patterns and provide transaction context if legitimate.',
  },
  {
    code: 121,
    key: 'pattern_violation',
    category: 'autonomous',
    userMeaning: 'A suspicious activity pattern triggered enforcement.',
    whatToDo: 'Document intent and counterparties, then appeal if this was expected behavior.',
  },
  {
    code: 122,
    key: 'suspicious_pattern',
    category: 'autonomous',
    userMeaning: 'Behavior looked unusual versus normal usage patterns.',
    whatToDo: 'Use smaller, spaced actions and submit extra context for manual review.',
  },
  {
    code: 123,
    key: 'pattern_detected',
    category: 'autonomous',
    userMeaning: 'A watch pattern was detected and logged.',
    whatToDo: 'Monitor follow-up events and avoid repetitive high-risk behavior.',
  },
  {
    code: 130,
    key: 'oracle_high_risk',
    category: 'autonomous',
    userMeaning: 'External risk signal marked the action as high risk.',
    whatToDo: 'Wait for risk state to cool down and provide evidence if the signal is inaccurate.',
  },
  {
    code: 131,
    key: 'oracle_medium_risk',
    category: 'autonomous',
    userMeaning: 'External risk signal marked the action as medium risk.',
    whatToDo: 'Proceed cautiously and avoid large or repetitive actions during the monitored period.',
  },
  {
    code: 140,
    key: 'progressive_unfreeze',
    category: 'autonomous',
    userMeaning: 'Restrictions are being lifted in controlled stages.',
    whatToDo: 'Maintain compliant behavior while access is gradually restored.',
  },
  {
    code: 300,
    key: 'auto_low_score',
    category: 'guardian',
    userMeaning: 'Guardian automation applied restrictions due to low score state.',
    whatToDo: 'Review your recent activity and submit an appeal if state appears incorrect.',
  },
  {
    code: 301,
    key: 'auto_very_low_score',
    category: 'guardian',
    userMeaning: 'Guardian automation escalated due to very low score.',
    whatToDo: 'Provide detailed evidence and request manual review via appeal.',
  },
  {
    code: 302,
    key: 'auto_critical_score',
    category: 'guardian',
    userMeaning: 'Guardian applied critical-score protections.',
    whatToDo: 'Use appeal flow immediately and include full timeline + transaction evidence.',
  },
  {
    code: 303,
    key: 'auto_score_recovered',
    category: 'guardian',
    userMeaning: 'Your score recovered enough for automated restriction lift handling.',
    whatToDo: 'Continue compliant activity to preserve access improvements.',
  },
  {
    code: 324,
    key: 'governance_abuse_violation',
    category: 'guardian',
    userMeaning: 'Governance abuse policy was triggered.',
    whatToDo: 'Provide proposal/vote context and intent in your appeal details.',
  },
  {
    code: 450,
    key: 'manual_proposal_flag',
    category: 'guardian',
    userMeaning: 'A proposal was manually flagged for further review.',
    whatToDo: 'Attach proposal rationale and supporting references for governance review.',
  },
  {
    code: 500,
    key: 'dao_manual_score_set',
    category: 'core',
    userMeaning: 'DAO executed a direct score update.',
    whatToDo: 'Check governance context and published rationale if you need clarification.',
  },
  {
    code: 501,
    key: 'operator_reward',
    category: 'core',
    userMeaning: 'An authorized module rewarded your score.',
    whatToDo: 'No action needed unless event context appears incorrect.',
  },
  {
    code: 502,
    key: 'operator_punish',
    category: 'core',
    userMeaning: 'An authorized module reduced your score.',
    whatToDo: 'Review reason and submit appeal evidence if reduction was incorrect.',
  },
  {
    code: 503,
    key: 'dispute_approved_adjustment',
    category: 'core',
    userMeaning: 'A dispute resolution changed your score.',
    whatToDo: 'Track final resolution notes and verify updated status in-app.',
  },
];

export function getSeerReasonCodeInfo(code: number): SeerReasonCodeInfo | null {
  return SEER_REASON_CODES.find((item) => item.code === code) ?? null;
}
