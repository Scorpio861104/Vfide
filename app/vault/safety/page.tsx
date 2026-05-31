'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeft, Shield, Users, Clock, Heart, Lock, Eye, AlertTriangle, ChevronRight } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { GlassCard } from '@/components/ui/GlassCard';
import { useLocale } from '@/lib/locale/LocaleProvider';

/**
 * /vault/safety — the canonical plain-language explanation of CardBoundVault safety.
 *
 * This page exists because the protocol's safety architecture is invisible
 * without explanation. Users open the app, see a wallet-like UI, and assume
 * either "this works like a bank" (which it doesn't) or "this is crypto so
 * I'm on my own" (which is also wrong). The truth is in between, and the
 * truth is what makes VFIDE worth trusting.
 *
 * Audience: end users (especially merchants in serious financial decisions),
 * influencers doing reveal walkthroughs, auditors, grant reviewers.
 *
 * Style: honest first, friendly second. No marketing fluff. If a feature has
 * a real tradeoff, name the tradeoff.
 */
export default function VaultSafetyPage() {
  const { locale } = useLocale();
  void locale;

  return (
    <>
      <div className="min-h-screen md:pt-[3.5rem] text-white">
        <div className="container mx-auto max-w-3xl px-4 pb-16">
          <Link
            href="/vault"
            className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200"
          >
            <ArrowLeft size={16} /> Back to your vault
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-3 flex items-center gap-3">
              <Shield className="text-cyan-400" size={28} />
              How your vault is protected
            </h1>
            <p className="text-gray-400 leading-relaxed">
              VFIDE doesn&apos;t hold your money. Your vault belongs to you alone. This
              page explains exactly what that means, what could go wrong, and what
              VFIDE does to help you recover from the things that go wrong.
              Read what&apos;s relevant to you — every section is self-contained.
            </p>
          </div>

          {/* ─────────────────────────────────────────────────────────── */}
          <Section
            icon={<Lock className="text-emerald-400" size={20} />}
            title="What 'non-custodial' actually means"
          >
            <p>
              When you open a vault on VFIDE, the only person who can move money
              out of it is you. There is no admin key. There is no &quot;reset
              password&quot; button. Nobody at VFIDE, nobody at Anthropic, nobody
              at any company can freeze your account, reverse your transactions,
              or take what&apos;s yours.
            </p>
            <p>
              This is the entire point of crypto, and it&apos;s why VFIDE can promise
              zero merchant fees — because there&apos;s no middleman taking a cut, and
              no central party deciding what you can and can&apos;t do.
            </p>
            <Tradeoff>
              If you lose your phone and have no recovery set up, your vault is
              permanently inaccessible. There is no &quot;forgot password&quot;
              flow. This is the cost of nobody being able to take your money:
              nobody can give it back either, unless you&apos;ve configured a way for
              them to. The next sections explain how.
            </Tradeoff>
          </Section>

          {/* ─────────────────────────────────────────────────────────── */}
          <Section
            icon={<Users className="text-cyan-400" size={20} />}
            title="Recovery guardians"
          >
            <p>
              Guardians are people you trust who can help you recover your vault
              if you lose your phone. They could be your sister, your business
              partner, your best friend, your accountant. You can have up to 10
              guardians per vault.
            </p>
            <p>
              <strong className="text-white">Guardians can&apos;t touch your money.</strong>{' '}
              They can&apos;t see your balance, your transactions, your customers, or
              your earnings. The only thing they can do is vote &quot;yes, this
              is really &#123;your name&#125; trying to recover their vault.&quot;
            </p>
            <p>
              You also set a <strong>threshold</strong> — the number of guardians
              who must approve before a recovery proceeds. If you have 3
              guardians and a threshold of 2, then 2 of them must agree before
              your vault can be transferred to a new wallet. This protects you
              if one guardian is compromised, unreachable, or no longer
              trustworthy.
            </p>
            <SubItem title="Recommended setup">
              At least 3 guardians, threshold 2-of-3. This way you can recover
              even if 1 guardian is unavailable, and an attacker would need to
              compromise 2 of your trusted people to take your vault.
            </SubItem>
            <SubItem title="The 7-day maturity period">
              When you add a new guardian, they can&apos;t vote in recovery for the
              first 7 days. This prevents an attacker who briefly compromises
              your account from adding a fake guardian and immediately using
              them — you have a week to notice and remove anyone you didn&apos;t add.
            </SubItem>
          </Section>

          {/* ─────────────────────────────────────────────────────────── */}
          <Section
            icon={<Shield className="text-amber-400" size={20} />}
            title="Trustees — who can START a recovery"
          >
            <p>
              There&apos;s a difference between approving a recovery and starting one.
              Every guardian can approve. Only <strong>trustees</strong> can
              start a recovery on your behalf.
            </p>
            <p>
              This matters because if you lose your phone, you can&apos;t easily start
              a recovery yourself — you might not have access to the app at all.
              A trustee can kick off the process for you. You then have a
              waiting period (your veto window) during which you can cancel if
              they started one inappropriately, before any of your other
              guardians can approve it.
            </p>
            <p>
              <strong className="text-white">Granting trustee status is the most powerful permission you give on your vault.</strong>{' '}
              Only designate trustees who you trust to act in your real
              interest, not just to vote yes when asked.
            </p>
            <SubItem title="Why trustee status has a 24-hour timelock">
              When you promote a guardian to trustee, the change waits 24 hours
              before taking effect. This means even if your account is briefly
              compromised, the attacker can&apos;t instantly grant themselves
              trustee power — you (or another guardian) have a day to cancel.
            </SubItem>
            <SubItem title="Why we recommend at least one trustee">
              If you have no trustees, you can still recover from a new
              device — but you need to be able to reach VFIDE to start the
              process. If your phone is destroyed and you&apos;re locked out of
              your accounts entirely, you&apos;ll need a trustee to start things
              moving on your behalf.
            </SubItem>
          </Section>

          {/* ─────────────────────────────────────────────────────────── */}
          <Section
            icon={<Clock className="text-cyan-400" size={20} />}
            title="The veto window"
          >
            <p>
              When a recovery starts on your vault — by you from a new device or
              by a trustee — there&apos;s a waiting period before it completes. By
              default this is 7 days. During this window, you can cancel the
              recovery by signing a single transaction from your existing
              wallet.
            </p>
            <p>
              This is your last line of defense against a rogue trustee or
              against being tricked into recovery. If a recovery starts and you
              didn&apos;t request it, you have a full week to notice the
              notification and cancel.
            </p>
            <SubItem title="You can configure your own veto window (3 to 30 days)">
              Travel a lot? Pick 14 or 21 days so you have time to notice even
              on long trips. Want to be able to recover quickly when you
              actually lose your phone? Pick 5 days. The default of 7 is a
              reasonable middle ground. Anything below 3 days is rejected by
              the protocol because it&apos;s not enough time for most people to
              respond.
            </SubItem>
            <SubItem title="The activity-based extension">
              If your vault has been active recently (any transaction in the
              last 30 days) OR if you haven&apos;t completed guardian setup yet,
              the window is automatically extended to 14 days. The system
              assumes an active user is more likely to notice problems and
              gives them more time.
            </SubItem>
            <Tradeoff>
              A longer veto window means safer recoveries but slower legitimate
              ones. If you genuinely lose your phone, your recovery will take
              at least your veto window to complete. Pick a length that fits
              your actual risk tolerance.
            </Tradeoff>
          </Section>

          {/* ─────────────────────────────────────────────────────────── */}
          <Section
            icon={<AlertTriangle className="text-amber-400" size={20} />}
            title="What if a guardian goes rogue?"
          >
            <p>
              Worth being honest: the protocol cannot help you if all of your
              guardians decide together to take your vault. The whole point of
              guardians is that they collectively have the power to recover
              your vault, which means they collectively have the power to take
              it. Choose them like that&apos;s true — because it is.
            </p>
            <p>
              What VFIDE does protect against:
            </p>
            <ul className="space-y-2 list-disc list-inside text-sm text-gray-300 ml-2">
              <li>
                A <strong>single</strong> rogue guardian (or trustee) cannot
                take your vault. They need the approval threshold (typically
                2-of-3) and they need to outlast your veto window without
                you cancelling.
              </li>
              <li>
                A guardian who tries to harass you with repeated false recovery
                attempts is locked out for 30 days after each one is cancelled.
                Other guardians can still help in a real emergency.
              </li>
              <li>
                A briefly-compromised account can&apos;t be used to instantly grant
                attacker-friendly permissions. Trustee promotion, guardian
                changes, and threshold changes all wait 24 hours before
                taking effect.
              </li>
              <li>
                A guardian who is removed mid-recovery still counts against
                their original snapshot, so removing guardians can never
                accidentally lower the threshold during an active recovery.
              </li>
            </ul>
          </Section>

          {/* ─────────────────────────────────────────────────────────── */}
          <Section
            icon={<Heart className="text-pink-400" size={20} />}
            title="Inheritance — what happens if something happens to you"
          >
            <p>
              VFIDE has a separate system from recovery for the case where
              you&apos;re permanently unavailable, not just temporarily
              unreachable. Inheritance lets you designate heirs who can claim
              your vault after a period of inactivity, but only with the
              involvement of your guardians.
            </p>
            <p>
              The flow is: you set up heirs and their inheritance shares once.
              When your guardians believe you are no longer able to access
              your vault, they can initiate the inheritance claim on your behalf.
              The vault then enters a 30-day veto period — during which you can
              cancel it if you are still active — before entering a memorial state
              where assets are distributed to your heirs based on your configured
              shares.
            </p>
            <SubItem title="Why this is separate from recovery">
              Recovery assumes you&apos;re alive and trying to get your vault back.
              Inheritance assumes you&apos;re not coming back. The two have
              different time scales, different participants, and different
              outcomes. Recovery returns the vault to you. Inheritance
              distributes the vault to others.
            </SubItem>
            <SubItem title="The DAO guardian protection">
              An external DAO guardian can be added specifically as an
              inheritance veto — they can stop an inheritance claim if your
              normal guardians try to start one fraudulently, but they
              cannot start one themselves.
            </SubItem>
          </Section>

          {/* ─────────────────────────────────────────────────────────── */}
          <Section
            icon={<Users className="text-emerald-400" size={20} />}
            title="Business continuity — what happens during recovery"
          >
            <p>
              If you&apos;re a merchant, this matters: recovery doesn&apos;t shut down
              your business.
            </p>
            <p>
              While a recovery claim is in its veto window, your vault stays
              fully operational. Inbound payments still arrive. You can still
              send outbound transactions from your existing wallet. Customers
              don&apos;t see anything different. Only the actual ownership transfer
              is delayed until the window expires.
            </p>
            <p>
              This was a deliberate design choice. A protocol that freezes
              your vault for a week during recovery would be useless for any
              merchant who depends on daily cash flow. VFIDE assumes you need
              to keep running your business while you deal with the
              recovery — and so the recovery process never holds your
              business hostage.
            </p>
          </Section>

          {/* ─────────────────────────────────────────────────────────── */}
          <Section
            icon={<Eye className="text-blue-400" size={20} />}
            title="What's public and what's not"
          >
            <p>
              VFIDE operates on Base, a public blockchain. Some things about
              your vault are visible to anyone who looks. Some things are not.
            </p>
            <ul className="space-y-2 list-disc list-inside text-sm text-gray-300 ml-2">
              <li>
                <strong>Public:</strong> your vault&apos;s address, its transaction
                history, balance changes, the addresses of your guardians.
              </li>
              <li>
                <strong>Public (opt-in):</strong> if you register as a
                merchant, your business name, logo, category, and links.
                This is opt-in — individual users are not publicly
                identifiable by default.
              </li>
              <li>
                <strong>Not public:</strong> your real-world identity,
                contact info, anything you haven&apos;t explicitly chosen to
                publish.
              </li>
            </ul>
            <p>
              For a complete breakdown of what&apos;s visible to whom and how to
              think about privacy on VFIDE, see the{' '}
              <Link href="/legal" className="text-cyan-300 hover:text-cyan-200">
                full privacy explanation
              </Link>.
            </p>
          </Section>

          {/* ─────────────────────────────────────────────────────────── */}
          <GlassCard hover={false} className="mt-8 p-5">
            <h3 className="text-white font-semibold mb-2">Questions? Confused?</h3>
            <p className="text-sm text-gray-400 mb-3">
              The hardest part of self-custody is understanding what you&apos;re
              actually getting. If anything on this page doesn&apos;t make sense,
              that&apos;s a problem with us — not with you. Reach out and tell us
              what was unclear.
            </p>
            <Link
              href="/support"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
            >
              Tell us what was unclear
              <ChevronRight size={14} />
            </Link>
          </GlassCard>
        </div>
      </div>
      <Footer />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Layout helpers — kept inline since they're page-specific
// ─────────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <GlassCard hover={false} className="mb-4 p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <div className="text-sm text-gray-300 space-y-3 leading-relaxed">{children}</div>
    </GlassCard>
  );
}

function SubItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 pl-3 border-l-2 border-cyan-500/30">
      <div className="font-semibold text-white text-sm">{title}</div>
      <div className="text-xs text-gray-400 mt-1 leading-relaxed">{children}</div>
    </div>
  );
}

function Tradeoff({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-200 leading-relaxed">
          <strong className="text-amber-300">Tradeoff: </strong>
          {children}
        </div>
      </div>
    </div>
  );
}
