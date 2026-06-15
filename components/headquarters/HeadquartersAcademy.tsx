'use client';

/**
 * Headquarters Academy (Platform Transformation, Wave 4).
 *
 * Embedded learning, not a portal. Reuses the existing in-place education system (KnowledgePanelGroup — collapsed by
 * default, "open any to learn in place, no navigation required") and the domain content already written for trust,
 * commerce, and continuity. It adds the two domains that had no embedded education yet — Preparedness and Governance
 * — drawing their copy from `lib/academy/headquartersContent.ts`, then maps each headquarters to its learning so a
 * lesson appears exactly where it is relevant (right beneath the Seer that teaches it).
 */
import { KnowledgePanelGroup, type KnowledgePanelProps } from '@/components/education/KnowledgePanel';
import { ContinuityKnowledge, TrustKnowledge, MerchantKnowledge } from '@/components/education/InstitutionKnowledge';
import { PREPAREDNESS_CONTENT, GOVERNANCE_CONTENT, HQ_ACADEMY_MAP, type LearnPanel } from '@/lib/academy/headquartersContent';
import type { DomainId } from '@/lib/headquarters/model';
import { Shield, LifeBuoy, Users, HeartHandshake, Landmark, Vote, Scale, Coins, type LucideIcon } from 'lucide-react';

const LIBRARY = { label: 'Go deeper in the Knowledge Library', href: '/seer-academy' };
const PREP_ICONS: LucideIcon[] = [Shield, LifeBuoy, Users, HeartHandshake];
const GOV_ICONS: LucideIcon[] = [Landmark, Vote, Scale, Coins];

function toPanels(content: LearnPanel[], icons: LucideIcon[]): KnowledgePanelProps[] {
  return content.map((p, i) => ({
    headline: p.headline,
    teaser: p.teaser,
    explanation: p.explanation,
    benefits: p.benefits,
    icon: icons[i],
    learnMore: p.learnMore ? LIBRARY : undefined,
  }));
}

function PreparednessKnowledge() {
  return <KnowledgePanelGroup title="Getting prepared" subtitle="Plain explanations of readiness — open any to learn in place." panels={toPanels(PREPAREDNESS_CONTENT, PREP_ICONS)} />;
}
function GovernanceKnowledge() {
  return <KnowledgePanelGroup title="How governance works" subtitle="Simple explanations of taking part — open any to learn in place." panels={toPanels(GOVERNANCE_CONTENT, GOV_ICONS)} />;
}

/** Map a headquarters to its embedded learning. */
export function HeadquartersAcademy({ domain }: { domain: DomainId }) {
  const source = HQ_ACADEMY_MAP[domain];
  switch (source) {
    case 'continuity': return <ContinuityKnowledge />;
    case 'merchant': return <MerchantKnowledge />;
    case 'trust': return <TrustKnowledge />;
    case 'preparedness': return <PreparednessKnowledge />;
    case 'governance': return <GovernanceKnowledge />;
  }
}
