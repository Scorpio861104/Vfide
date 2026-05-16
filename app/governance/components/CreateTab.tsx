'use client';

/**
 * CreateTab — submit a new governance proposal on-chain.
 *
 * Replaces the Phase 4 Turn 1 audit finding: the previous version POSTed to
 * /api/proposals (an off-chain DB endpoint) that the DAO contract never saw.
 * This rewrite calls useDAO.propose() directly with EIP-712 typed args.
 *
 * Constraints enforced by the DAO contract (must be respected in UI):
 *   • target != address(0)        — every proposal must point to a real contract
 *   • value == 0                  — no native-ETH-bearing proposals
 *   • bytes(description).length>0 — empty description rejected
 *   • requireProposalPolicies     — proposal types with no configured policy revert
 *   • proposalCooldown            — proposer must wait between submissions
 *   • isEligible(msg.sender)      — ProofScore threshold
 *
 * Two paths:
 *   Templates — pre-fills target + data + ptype for the most common DAO actions.
 *               V1 templates target CommerceEscrow (the only V1-deployed contract
 *               with DAO-only actions): resolve(id, buyerWins) and
 *               setMinDisputeAmountForPenalty(amount). These close the two
 *               remaining slots in the Phase 3d CommerceEscrow surface map.
 *   Custom    — freeform target + data hex + ptype, for advanced users.
 */

import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { encodeFunctionData, isAddress, parseUnits, type Address, type Hex } from 'viem';
import {
  Loader2,
  Vote,
  AlertCircle,
  CheckCircle2,
  Info,
  Wallet,
  Scale,
  Settings,
  Wrench,
  Flag,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useDAO, ProposalType, proposalTypeLabel } from '@/hooks/useDAO';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';
// MerchantRegistryABI is the re-export name for the merged VFIDECommerce.json file,
// which contains MerchantRegistry + VFIDECommerce + CommerceEscrow function ABIs.
// We use it here for encoding CommerceEscrow.resolve and CommerceEscrow.setMinDisputeAmountForPenalty calls.
import { MerchantRegistryABI as VFIDECommerceABI, FraudRegistryABI } from '@/lib/abis';

type Mode = 'template' | 'custom';
type TemplateKey = 'resolve' | 'setMinDispute' | 'clearFlag' | 'confirmFraud' | 'dismissComplaints';

interface TemplateDescriptor {
  key: TemplateKey;
  label: string;
  description: string;
  ptype: ProposalType;
  Icon: typeof Scale;
  /** Group label for visual separation of templates by contract domain. */
  group: 'commerce' | 'fraud';
}

const TEMPLATES: TemplateDescriptor[] = [
  // Commerce / dispute templates (Phase 4 Turn 3 — close Phase 3d CommerceEscrow surface)
  {
    key: 'resolve',
    label: 'Resolve a CommerceEscrow dispute',
    description:
      'DAO arbitrates a disputed escrow. Funds go to either the buyer or the merchant based on the vote outcome.',
    ptype: ProposalType.SecurityAction,
    Icon: Scale,
    group: 'commerce',
  },
  {
    key: 'setMinDispute',
    label: 'Set CommerceEscrow minimum dispute amount',
    description:
      'Change the smallest escrow amount that can be disputed. Lower values mean more arbitration overhead; higher values restrict small-amount disputes.',
    ptype: ProposalType.ProtocolChange,
    Icon: Settings,
    group: 'commerce',
  },
  // Fraud-arbitration templates (Phase 5 Turn 3 — reach FraudRegistry DAO-only surface)
  {
    key: 'confirmFraud',
    label: 'Confirm fraud against an address',
    description:
      'DAO confirms an address committed fraud after community complaints. The address gets flagged: outgoing transfers held in 30-day escrow.',
    ptype: ProposalType.SecurityAction,
    Icon: Flag,
    group: 'fraud',
  },
  {
    key: 'dismissComplaints',
    label: 'Dismiss complaints as false',
    description:
      'DAO finds the complaints baseless. Reporters lose ProofScore (-50 each). The target stays clean; no flag is applied.',
    ptype: ProposalType.SecurityAction,
    Icon: XCircle,
    group: 'fraud',
  },
  {
    key: 'clearFlag',
    label: 'Clear an existing fraud flag',
    description:
      'DAO retroactively removes a fraud flag (e.g., after appeal). All currently escrowed transfers from the address are queued for refund to the sender.',
    ptype: ProposalType.SecurityAction,
    Icon: ShieldCheck,
    group: 'fraud',
  },
];

export function CreateTab() {
  const { address } = useAccount();
  const dao = useDAO();
  const commerceEscrowAddress = CONTRACT_ADDRESSES.CommerceEscrow;
  const commerceEscrowConfigured = isConfiguredContractAddress(commerceEscrowAddress);
  const fraudRegistryAddress = CONTRACT_ADDRESSES.FraudRegistry;
  const fraudRegistryConfigured = isConfiguredContractAddress(fraudRegistryAddress);

  // ── State ─────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('template');
  const [templateKey, setTemplateKey] = useState<TemplateKey>('resolve');
  const [description, setDescription] = useState('');

  // Template-specific inputs
  const [resolveEscrowId, setResolveEscrowId] = useState('');
  const [resolveBuyerWins, setResolveBuyerWins] = useState<boolean>(true);
  const [minDisputeAmount, setMinDisputeAmount] = useState('');
  // Shared input for the 3 fraud templates (all take a single `address target` arg).
  const [fraudTarget, setFraudTarget] = useState('');

  // Custom inputs
  const [customPtype, setCustomPtype] = useState<ProposalType>(ProposalType.Generic);
  const [customTarget, setCustomTarget] = useState('');
  const [customData, setCustomData] = useState('0x');

  // Submission state
  const [error, setError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<bigint | null>(null);

  const currentTemplate = TEMPLATES.find((t) => t.key === templateKey)!;

  // ── Build call data ───────────────────────────────────────────────────────
  const buildProposalData = (): {
    ptype: ProposalType;
    target: Address;
    value: bigint;
    data: Hex;
  } | null => {
    if (mode === 'template') {
      // Guard by template group — only the relevant contract needs to be configured
      if (currentTemplate.group === 'commerce' && !commerceEscrowConfigured) {
        setError('CommerceEscrow is not configured for this environment — commerce templates cannot be submitted.');
        return null;
      }
      if (currentTemplate.group === 'fraud' && !fraudRegistryConfigured) {
        setError('FraudRegistry is not configured for this environment — fraud templates cannot be submitted.');
        return null;
      }

      if (templateKey === 'resolve') {
        const idStr = resolveEscrowId.trim();
        if (!idStr) {
          setError('Enter the escrow id.');
          return null;
        }
        let escrowId: bigint;
        try {
          escrowId = BigInt(idStr);
        } catch {
          setError('Escrow id must be a number.');
          return null;
        }
        const data = encodeFunctionData({
          abi: VFIDECommerceABI,
          functionName: 'resolve',
          args: [escrowId, resolveBuyerWins],
        });
        return {
          ptype: currentTemplate.ptype,
          target: commerceEscrowAddress as Address,
          value: 0n,
          data,
        };
      }
      if (templateKey === 'setMinDispute') {
        const amtStr = minDisputeAmount.trim();
        if (!amtStr) {
          setError('Enter the minimum dispute amount (in VFIDE).');
          return null;
        }
        let amountWei: bigint;
        try {
          amountWei = parseUnits(amtStr, 18);
        } catch {
          setError('Invalid amount.');
          return null;
        }
        const data = encodeFunctionData({
          abi: VFIDECommerceABI,
          functionName: 'setMinDisputeAmountForPenalty',
          args: [amountWei],
        });
        return {
          ptype: currentTemplate.ptype,
          target: commerceEscrowAddress as Address,
          value: 0n,
          data,
        };
      }
      // ── Fraud arbitration templates (FraudRegistry target) ────────────────
      if (
        templateKey === 'clearFlag' ||
        templateKey === 'confirmFraud' ||
        templateKey === 'dismissComplaints'
      ) {
        const tgt = fraudTarget.trim();
        if (!isAddress(tgt)) {
          setError('Enter a valid target address.');
          return null;
        }
        const data = encodeFunctionData({
          abi: FraudRegistryABI,
          functionName: templateKey,
          args: [tgt as Address],
        });
        return {
          ptype: currentTemplate.ptype,
          target: fraudRegistryAddress as Address,
          value: 0n,
          data,
        };
      }
      setError('Unknown template.');
      return null;
    }

    // Custom mode
    const target = customTarget.trim();
    if (!isAddress(target)) {
      setError('Enter a valid target contract address.');
      return null;
    }
    const data = customData.trim();
    if (!data.startsWith('0x')) {
      setError('Calldata must start with 0x.');
      return null;
    }
    if (data.length % 2 !== 0) {
      setError('Calldata must have an even number of hex digits.');
      return null;
    }
    return {
      ptype: customPtype,
      target: target as Address,
      value: 0n,
      data: data as Hex,
    };
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmittedId(null);

    if (!description.trim()) {
      setError('Description is required.');
      return;
    }
    if (!dao.isEligible) {
      setError('You are not currently eligible to submit proposals (ProofScore below minimum).');
      return;
    }
    if (dao.cooldownActive) {
      const readyAt = new Date(Number(dao.cooldownEndsAt) * 1000);
      setError(`Proposal cooldown active. You can submit again after ${readyAt.toLocaleString()}.`);
      return;
    }

    const payload = buildProposalData();
    if (!payload) return;

    try {
      const newId = await dao.propose({
        ptype: payload.ptype,
        target: payload.target,
        value: payload.value,
        data: payload.data,
        description: description.trim(),
      });
      if (newId !== undefined) {
        setSubmittedId(newId);
      } else {
        // Submission succeeded but the id couldn't be extracted — non-fatal
        setSubmittedId(0n);
      }
      // Reset only the per-template inputs; description stays so the user can see it
      setResolveEscrowId('');
      setMinDisputeAmount('');
      setFraudTarget('');
      setCustomTarget('');
      setCustomData('0x');
    } catch (e: any) {
      const message = e?.shortMessage || e?.message || 'Failed to submit proposal';
      // Common error: policy not configured
      if (
        message.includes('ProposalTargetNotAllowed') ||
        message.includes('ProposalSelectorNotAllowed')
      ) {
        setError(
          'This proposal type is not currently configured for this target/selector. Governance policies must be set by the DAO before proposals of this kind can be submitted.'
        );
      } else if (message.includes('NotEligible')) {
        setError('You are not eligible to submit proposals.');
      } else if (message.includes('ProposalCooldownActive')) {
        setError('Proposal cooldown active. Wait before submitting another proposal.');
      } else {
        setError(message);
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Vote size={40} className="text-gray-600 mb-4" />
        <p className="text-gray-400">Connect your wallet to submit a governance proposal.</p>
      </div>
    );
  }

  if (!dao.daoConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle size={40} className="text-amber-400 mb-4" />
        <p className="text-zinc-100 font-semibold mb-1">DAO not configured</p>
        <p className="text-zinc-400 text-sm">Set NEXT_PUBLIC_DAO_ADDRESS to enable governance.</p>
      </div>
    );
  }

  const eligibilityWarning = !dao.isEligible;
  const cooldownWarning = dao.cooldownActive;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Eligibility banner */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex items-start gap-3">
        <Wallet className="text-cyan-400 shrink-0 mt-0.5" size={18} />
        <div className="flex-1 text-sm">
          <p className="text-zinc-100">
            Voting power: <span className="font-semibold tabular-nums">{dao.votingPower.toString()}</span>
          </p>
          {eligibilityWarning && (
            <p className="text-amber-300 text-xs mt-1 flex items-center gap-1">
              <Info size={10} /> Not currently eligible — ProofScore below minimum
            </p>
          )}
          {cooldownWarning && (
            <p className="text-amber-300 text-xs mt-1 flex items-center gap-1">
              <Info size={10} /> Proposal cooldown active until{' '}
              {new Date(Number(dao.cooldownEndsAt) * 1000).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Mode selector */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">New governance proposal</h3>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('template')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors inline-flex items-center justify-center gap-2 ${
              mode === 'template'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
            }`}
          >
            <Scale size={14} /> From template
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors inline-flex items-center justify-center gap-2 ${
              mode === 'custom'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
            }`}
          >
            <Wrench size={14} /> Custom
          </button>
        </div>

        {/* Template mode */}
        {mode === 'template' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs text-zinc-400 uppercase tracking-wide">Template</label>
              {TEMPLATES.map((t) => {
                const Icon = t.Icon;
                const selected = templateKey === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTemplateKey(t.key)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selected
                        ? 'bg-cyan-500/5 border-cyan-500/30'
                        : 'bg-zinc-900 border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon size={18} className={selected ? 'text-cyan-400' : 'text-zinc-400'} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${selected ? 'text-white' : 'text-zinc-200'}`}>
                          {t.label}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">{t.description}</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Proposal type:{' '}
                          <span className="text-zinc-400">{proposalTypeLabel(t.ptype)}</span>
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Resolve dispute template inputs */}
            {templateKey === 'resolve' && (
              <div className="space-y-3 pl-1 border-l-2 border-cyan-500/20 ml-1">
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Escrow id</label>
                  <input
                    type="text"
                    value={resolveEscrowId}
                    onChange={(e) => setResolveEscrowId(e.target.value)}
                    placeholder="e.g. 42"
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none text-sm tabular-nums"
                  />
                </div>
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Resolution</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setResolveBuyerWins(true)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        resolveBuyerWins
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      Buyer wins (refund)
                    </button>
                    <button
                      onClick={() => setResolveBuyerWins(false)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        !resolveBuyerWins
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      Merchant wins (release)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Set min dispute amount inputs */}
            {templateKey === 'setMinDispute' && (
              <div className="space-y-3 pl-1 border-l-2 border-cyan-500/20 ml-1">
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Minimum dispute amount (VFIDE)</label>
                  <input
                    type="number"
                    value={minDisputeAmount}
                    onChange={(e) => setMinDisputeAmount(e.target.value)}
                    placeholder="e.g. 10"
                    step="0.01"
                    min="0"
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none text-sm tabular-nums"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Escrows below this amount won't trigger the merchant penalty on dispute resolution.
                  </p>
                </div>
              </div>
            )}

            {/* Fraud arbitration template inputs (clearFlag / confirmFraud / dismissComplaints) */}
            {(templateKey === 'clearFlag' ||
              templateKey === 'confirmFraud' ||
              templateKey === 'dismissComplaints') && (
              <div className="space-y-3 pl-1 border-l-2 border-cyan-500/20 ml-1">
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Target address</label>
                  <input
                    type="text"
                    value={fraudTarget}
                    onChange={(e) => setFraudTarget(e.target.value)}
                    placeholder="0x…"
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none text-sm font-mono"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    {templateKey === 'clearFlag' &&
                      'The flagged address that should have its flag removed (e.g., after appeal review).'}
                    {templateKey === 'confirmFraud' &&
                      'The address whose complaints the DAO is upholding. Will be flagged with 30-day transfer escrow.'}
                    {templateKey === 'dismissComplaints' &&
                      'The address whose complaints the DAO is dismissing. Reporters will be penalized.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom mode */}
        {mode === 'custom' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">Proposal type</label>
              <div className="grid grid-cols-2 gap-2">
                {[ProposalType.Generic, ProposalType.Financial, ProposalType.ProtocolChange, ProposalType.SecurityAction].map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => setCustomPtype(p)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        customPtype === p
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-700 hover:text-white'
                      }`}
                    >
                      {proposalTypeLabel(p)}
                    </button>
                  )
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Target contract address</label>
              <input
                type="text"
                value={customTarget}
                onChange={(e) => setCustomTarget(e.target.value)}
                placeholder="0x…"
                className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Calldata (hex)</label>
              <input
                type="text"
                value={customData}
                onChange={(e) => setCustomData(e.target.value)}
                placeholder="0x…"
                className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none text-xs font-mono"
              />
              <p className="text-xs text-zinc-500 mt-1 inline-flex items-start gap-1">
                <Info size={10} className="mt-0.5 shrink-0" />
                <span>
                  ABI-encoded function call. Use tools like cast / web3 to encode the target function selector and arguments.
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Description (always required) */}
        <div className="mt-6">
          <label className="block text-xs text-zinc-400 uppercase tracking-wide mb-2">
            Description / rationale
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="Explain why the DAO should pass this proposal. Voters use this to decide."
            className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:outline-none text-sm"
          />
          <p className="text-xs text-zinc-500 text-right mt-1">{description.length} / 5000</p>
        </div>

        {/* Error / success */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {submittedId !== null && !error && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-start gap-2">
            <CheckCircle2 size={12} className="shrink-0 mt-0.5" />
            <span>
              Proposal submitted on-chain
              {submittedId > 0n && (
                <>
                  {' '}as <span className="font-semibold">#{submittedId.toString()}</span>
                </>
              )}
              . It will appear in the Proposals tab once the transaction is confirmed.
            </span>
          </div>
        )}

        <button
          onClick={() => void handleSubmit()}
          disabled={dao.isWritePending || !description.trim() || eligibilityWarning || cooldownWarning}
          className="mt-6 w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {dao.isWritePending ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Submitting on-chain…
            </>
          ) : (
            <>
              <Vote size={16} /> Submit Proposal
            </>
          )}
        </button>

        {/* Helpful info about contract constraints */}
        <div className="mt-4 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-500 space-y-1">
          <p className="flex items-start gap-1">
            <Info size={10} className="mt-0.5 shrink-0" />
            <span>
              Proposals must point to a configured contract and use a configured function selector. If the
              DAO hasn't enabled this proposal type, submission will revert with a clear policy error.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
