'use client';

import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
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

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSearchParams } from 'next/navigation';
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
  Heart,
  PlusCircle,
  MinusCircle,
  Banknote,
  LifeBuoy,
} from 'lucide-react';
import { useDAO, ProposalType, proposalTypeLabel } from '@/hooks/useDAO';
import { CONTRACT_ADDRESSES, isConfiguredContractAddress } from '@/lib/contracts';
// MerchantRegistryABI is the re-export name for the merged VFIDECommerce.json file,
// which contains MerchantRegistry + VFIDECommerce + CommerceEscrow function ABIs.
// We use it here for encoding CommerceEscrow.resolve and CommerceEscrow.setMinDisputeAmountForPenalty calls.
import { MerchantRegistryABI as VFIDECommerceABI, FraudRegistryABI, SanctumVaultABI, EcoTreasuryVaultABI } from '@/lib/abis';

type Mode = 'template' | 'custom';
type TemplateKey =
  | 'resolve'
  | 'setMinDispute'
  | 'clearFlag'
  | 'confirmFraud'
  | 'dismissComplaints'
  | 'approveCharity'
  | 'removeCharity'
  | 'rejectDisbursement'
  | 'sendVFIDE'
  | 'rescueToken';

interface TemplateDescriptor {
  key: TemplateKey;
  label: string;
  description: string;
  ptype: ProposalType;
  Icon: typeof Scale;
  /** Group label for visual separation of templates by contract domain. */
  group: 'commerce' | 'fraud' | 'sanctum' | 'treasury';
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
  // Sanctum charity-registry templates (Tier 2 Phase 3 — close the DAO-only surface
  // of SanctumVault. Note: proposeDisbursement/approveDisbursement/executeDisbursement
  // are onlyApprover, not DAO-routed, so they appear only in the DisbursementsTab UI.)
  {
    key: 'approveCharity',
    label: 'Approve a new charity for Sanctum',
    description:
      'Add a charity to the SanctumVault registry. Once approved, the charity is eligible to receive disbursements proposed by approvers and paid from accumulated transfer fees.',
    ptype: ProposalType.Financial,
    Icon: PlusCircle,
    group: 'sanctum',
  },
  {
    key: 'removeCharity',
    label: 'Remove a charity from Sanctum',
    description:
      'Remove a charity from the SanctumVault registry. The charity becomes ineligible to receive new disbursements. A reason string is recorded on-chain.',
    ptype: ProposalType.Financial,
    Icon: MinusCircle,
    group: 'sanctum',
  },
  {
    key: 'rejectDisbursement',
    label: 'Reject a Sanctum disbursement proposal',
    description:
      'DAO veto of a disbursement proposed by approvers. Sanctum approvers can propose and approve disbursements directly, but the DAO retains rejection authority. A reason string is recorded on-chain.',
    ptype: ProposalType.SecurityAction,
    Icon: Heart,
    group: 'sanctum',
  },
  // EcoTreasuryVault templates (Tier 2 Phase 4 Turn 1 — close the DAO-only
  // surface of EcoTreasuryVault. sendVFIDE and rescueToken are the two
  // disbursement paths from the protocol's main VFIDE treasury.)
  {
    key: 'sendVFIDE',
    label: 'Send VFIDE from treasury',
    description:
      'Disburse VFIDE from the protocol treasury to a recipient address. A reason string is recorded on-chain alongside the transfer event.',
    ptype: ProposalType.Financial,
    Icon: Banknote,
    group: 'treasury',
  },
  {
    key: 'rescueToken',
    label: 'Rescue tokens accidentally sent to treasury',
    description:
      'Recover an ERC-20 token mistakenly sent to the treasury contract. The DAO specifies token contract, recipient, and amount.',
    ptype: ProposalType.Financial,
    Icon: LifeBuoy,
    group: 'treasury',
  },
];

export function CreateTab() {
  const { address } = useAccount();
  const dao = useDAO();
  const commerceEscrowAddress = CONTRACT_ADDRESSES.CommerceEscrow;
  const commerceEscrowConfigured = isConfiguredContractAddress(commerceEscrowAddress);
  const fraudRegistryAddress = CONTRACT_ADDRESSES.FraudRegistry;
  const fraudRegistryConfigured = isConfiguredContractAddress(fraudRegistryAddress);
  const sanctumVaultAddress = CONTRACT_ADDRESSES.SanctumVault;
  const sanctumVaultConfigured = isConfiguredContractAddress(sanctumVaultAddress);
  const ecoTreasuryAddress = CONTRACT_ADDRESSES.EcoTreasuryVault;
  const ecoTreasuryConfigured = isConfiguredContractAddress(ecoTreasuryAddress);

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
  // Sanctum charity-registry template inputs
  const [sanctumCharityAddress, setSanctumCharityAddress] = useState('');
  const [sanctumCharityName, setSanctumCharityName] = useState('');
  const [sanctumCharityCategory, setSanctumCharityCategory] = useState('');
  const [sanctumRemoveReason, setSanctumRemoveReason] = useState('');
  const [sanctumDisbursementId, setSanctumDisbursementId] = useState('');
  const [sanctumRejectReason, setSanctumRejectReason] = useState('');
  // EcoTreasuryVault DAO template inputs (Phase 4 Turn 1)
  const [treasurySendTo, setTreasurySendTo] = useState('');
  const [treasurySendAmount, setTreasurySendAmount] = useState('');
  const [treasurySendReason, setTreasurySendReason] = useState('');
  const [treasuryRescueToken, setTreasuryRescueToken] = useState('');
  const [treasuryRescueAmount, setTreasuryRescueAmount] = useState('');

  // Custom inputs
  const [customPtype, setCustomPtype] = useState<ProposalType>(ProposalType.Generic);
  const [customTarget, setCustomTarget] = useState('');
  const [customData, setCustomData] = useState('0x');

  // Submission state
  const [error, setError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<bigint | null>(null);

  // ── URL params: ?template=<key>&prefill=<json> ───────────────────────────
  // Q3-A pattern (Tier 2 plan): pages elsewhere in the app can deep-link into
  // CreateTab with a specific template pre-selected and form fields populated.
  // Used by DisbursementsTab "Reject" button, FinanceTab "Treasury Send" / "Rescue",
  // and any future cross-surface routing.
  //
  // Backward compatible: when no query params are present, the component keeps
  // its current defaults (template mode, 'resolve' template, empty inputs).
  // Only the first mount reads the URL — later edits are user-driven.
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!searchParams) return;
    const rawTemplate = searchParams.get('template');
    if (!rawTemplate) return;
    // Validate it matches a known TemplateKey before adopting.
    const valid = TEMPLATES.some((t) => t.key === rawTemplate);
    if (!valid) return;
    setMode('template');
    setTemplateKey(rawTemplate as TemplateKey);

    // Apply the prefill JSON if present. Schema is shallow: a flat object whose
    // keys are the field state-setter names without the `set` prefix
    // (e.g. {"sanctumDisbursementId":"42","sanctumRejectReason":"…"}).
    const rawPrefill = searchParams.get('prefill');
    if (!rawPrefill) return;
    let prefill: Record<string, unknown>;
    try {
      prefill = JSON.parse(rawPrefill);
    } catch {
      return; // malformed → silently ignore, user can fill manually
    }
    if (!prefill || typeof prefill !== 'object') return;
    const apply = (key: string, set: (v: string) => void) => {
      const v = prefill[key];
      if (typeof v === 'string') set(v);
    };
    apply('description', setDescription);
    apply('resolveEscrowId', setResolveEscrowId);
    apply('minDisputeAmount', setMinDisputeAmount);
    apply('fraudTarget', setFraudTarget);
    apply('sanctumCharityAddress', setSanctumCharityAddress);
    apply('sanctumCharityName', setSanctumCharityName);
    apply('sanctumCharityCategory', setSanctumCharityCategory);
    apply('sanctumRemoveReason', setSanctumRemoveReason);
    apply('sanctumDisbursementId', setSanctumDisbursementId);
    apply('sanctumRejectReason', setSanctumRejectReason);
    apply('treasurySendTo', setTreasurySendTo);
    apply('treasurySendAmount', setTreasurySendAmount);
    apply('treasurySendReason', setTreasurySendReason);
    apply('treasuryRescueToken', setTreasuryRescueToken);
    apply('treasuryRescueAmount', setTreasuryRescueAmount);
    if (typeof prefill.resolveBuyerWins === 'boolean') {
      setResolveBuyerWins(prefill.resolveBuyerWins);
    }
  }, [searchParams]);

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
      if (currentTemplate.group === 'sanctum' && !sanctumVaultConfigured) {
        setError('SanctumVault is not configured for this environment — sanctum templates cannot be submitted.');
        return null;
      }
      if (currentTemplate.group === 'treasury' && !ecoTreasuryConfigured) {
        setError('EcoTreasuryVault is not configured for this environment — treasury templates cannot be submitted.');
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
      // ── Sanctum charity-registry templates (SanctumVault target) ──────────
      if (templateKey === 'approveCharity') {
        const tgt = sanctumCharityAddress.trim();
        if (!isAddress(tgt)) {
          setError('Enter a valid charity address.');
          return null;
        }
        const name = sanctumCharityName.trim();
        if (!name) {
          setError('Enter the charity name.');
          return null;
        }
        const category = sanctumCharityCategory.trim();
        if (!category) {
          setError('Enter the charity category (e.g. Healthcare, Education).');
          return null;
        }
        const data = encodeFunctionData({
          abi: SanctumVaultABI,
          functionName: 'approveCharity',
          args: [tgt as Address, name, category],
        });
        return {
          ptype: currentTemplate.ptype,
          target: sanctumVaultAddress as Address,
          value: 0n,
          data,
        };
      }
      if (templateKey === 'removeCharity') {
        const tgt = sanctumCharityAddress.trim();
        if (!isAddress(tgt)) {
          setError('Enter the charity address to remove.');
          return null;
        }
        const reason = sanctumRemoveReason.trim();
        if (!reason) {
          setError('Enter a reason for the removal — it is recorded on-chain.');
          return null;
        }
        const data = encodeFunctionData({
          abi: SanctumVaultABI,
          functionName: 'removeCharity',
          args: [tgt as Address, reason],
        });
        return {
          ptype: currentTemplate.ptype,
          target: sanctumVaultAddress as Address,
          value: 0n,
          data,
        };
      }
      if (templateKey === 'rejectDisbursement') {
        const idStr = sanctumDisbursementId.trim();
        if (!idStr) {
          setError('Enter the disbursement proposal id.');
          return null;
        }
        let proposalId: bigint;
        try {
          proposalId = BigInt(idStr);
        } catch {
          setError('Disbursement id must be a number.');
          return null;
        }
        const reason = sanctumRejectReason.trim();
        if (!reason) {
          setError('Enter a rejection reason — it is recorded on-chain.');
          return null;
        }
        const data = encodeFunctionData({
          abi: SanctumVaultABI,
          functionName: 'rejectDisbursement',
          args: [proposalId, reason],
        });
        return {
          ptype: currentTemplate.ptype,
          target: sanctumVaultAddress as Address,
          value: 0n,
          data,
        };
      }
      // ── EcoTreasuryVault templates ─────────────────────────────────────────
      if (templateKey === 'sendVFIDE') {
        const to = treasurySendTo.trim();
        if (!isAddress(to)) {
          setError('Enter a valid recipient address.');
          return null;
        }
        const amtStr = treasurySendAmount.trim();
        if (!amtStr) {
          setError('Enter the VFIDE amount to send.');
          return null;
        }
        let amountWei: bigint;
        try {
          amountWei = parseUnits(amtStr, 18);
        } catch {
          setError('Invalid amount.');
          return null;
        }
        const reason = treasurySendReason.trim();
        if (!reason) {
          setError('Enter a reason — it is recorded on-chain alongside the transfer.');
          return null;
        }
        const data = encodeFunctionData({
          abi: EcoTreasuryVaultABI,
          functionName: 'sendVFIDE',
          args: [to as Address, amountWei, reason],
        });
        return {
          ptype: currentTemplate.ptype,
          target: ecoTreasuryAddress as Address,
          value: 0n,
          data,
        };
      }
      if (templateKey === 'rescueToken') {
        const token = treasuryRescueToken.trim();
        if (!isAddress(token)) {
          setError('Enter the ERC-20 token contract address.');
          return null;
        }
        const to = treasurySendTo.trim(); // reuses the same "recipient" field
        if (!isAddress(to)) {
          setError('Enter a valid recipient address.');
          return null;
        }
        const amtStr = treasuryRescueAmount.trim();
        if (!amtStr) {
          setError('Enter the token amount to rescue (in token units).');
          return null;
        }
        let amount: bigint;
        try {
          amount = BigInt(amtStr);
        } catch {
          setError('Invalid amount — must be a positive integer in the token\'s base units.');
          return null;
        }
        const data = encodeFunctionData({
          abi: EcoTreasuryVaultABI,
          functionName: 'rescueToken',
          args: [token as Address, to as Address, amount],
        });
        return {
          ptype: currentTemplate.ptype,
          target: ecoTreasuryAddress as Address,
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
        <div className="mt-6 flex justify-center">
          <VfideConnectButton size="md" />
        </div>
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
        <Wallet className="text-accent shrink-0 mt-0.5" size={18} />
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
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
            }`}
          >
            <Scale size={14} /> From template
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors inline-flex items-center justify-center gap-2 ${
              mode === 'custom'
                ? 'bg-accent/20 text-accent border border-accent/30'
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
                        ? 'bg-accent/5 border-accent/30'
                        : 'bg-zinc-900 border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon size={18} className={selected ? 'text-accent' : 'text-zinc-400'} />
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
              <div className="space-y-3 pl-1 border-l-2 border-accent/20 ml-1">
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Escrow id</label>
                  <input
                    type="text"
                    value={resolveEscrowId}
                    onChange={(e) => setResolveEscrowId(e.target.value)}
                    placeholder="e.g. 42"
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-accent focus:outline-none text-sm tabular-nums"
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
              <div className="space-y-3 pl-1 border-l-2 border-accent/20 ml-1">
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Minimum dispute amount (VFIDE)</label>
                  <input
                    type="number"
                    value={minDisputeAmount}
                    onChange={(e) => setMinDisputeAmount(e.target.value)}
                    placeholder="e.g. 10"
                    step="0.01"
                    min="0"
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-accent focus:outline-none text-sm tabular-nums"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Escrows below this amount won&apos;t trigger the merchant penalty on dispute resolution.
                  </p>
                </div>
              </div>
            )}

            {/* Fraud arbitration template inputs (clearFlag / confirmFraud / dismissComplaints) */}
            {(templateKey === 'clearFlag' ||
              templateKey === 'confirmFraud' ||
              templateKey === 'dismissComplaints') && (
              <div className="space-y-3 pl-1 border-l-2 border-accent/20 ml-1">
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Target address</label>
                  <input
                    type="text"
                    value={fraudTarget}
                    onChange={(e) => setFraudTarget(e.target.value)}
                    placeholder="0x…"
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-accent focus:outline-none text-sm font-mono"
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

            {/* Sanctum: approveCharity template inputs */}
            {templateKey === 'approveCharity' && (
              <div className="space-y-3 pl-1 border-l-2 border-pink-500/20 ml-1">
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Charity address</label>
                  <input
                    type="text"
                    value={sanctumCharityAddress}
                    onChange={(e) => setSanctumCharityAddress(e.target.value)}
                    placeholder="0x…"
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-pink-500 focus:outline-none text-sm font-mono"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    The wallet address that will receive Sanctum disbursements.
                  </p>
                </div>
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Charity name</label>
                  <input
                    type="text"
                    value={sanctumCharityName}
                    onChange={(e) => setSanctumCharityName(e.target.value)}
                    placeholder="e.g. Save the Children"
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-pink-500 focus:outline-none text-sm"
                  />
                </div>
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Category</label>
                  <input
                    type="text"
                    value={sanctumCharityCategory}
                    onChange={(e) => setSanctumCharityCategory(e.target.value)}
                    placeholder="e.g. Healthcare, Education, Environment"
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-pink-500 focus:outline-none text-sm"
                  />
                </div>
              </div>
            )}

            {/* Sanctum: removeCharity template inputs */}
            {templateKey === 'removeCharity' && (
              <div className="space-y-3 pl-1 border-l-2 border-pink-500/20 ml-1">
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Charity address</label>
                  <input
                    type="text"
                    value={sanctumCharityAddress}
                    onChange={(e) => setSanctumCharityAddress(e.target.value)}
                    placeholder="0x…"
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-pink-500 focus:outline-none text-sm font-mono"
                  />
                </div>
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Reason</label>
                  <textarea
                    value={sanctumRemoveReason}
                    onChange={(e) => setSanctumRemoveReason(e.target.value)}
                    placeholder="Why the charity is being removed. Recorded on-chain."
                    rows={2}
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-pink-500 focus:outline-none text-sm"
                  />
                </div>
              </div>
            )}

            {/* Sanctum: rejectDisbursement template inputs */}
            {templateKey === 'rejectDisbursement' && (
              <div className="space-y-3 pl-1 border-l-2 border-pink-500/20 ml-1">
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Disbursement id</label>
                  <input
                    type="text"
                    value={sanctumDisbursementId}
                    onChange={(e) => setSanctumDisbursementId(e.target.value)}
                    placeholder="e.g. 7"
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-pink-500 focus:outline-none text-sm tabular-nums"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    The proposal id of an approver-proposed disbursement the DAO is vetoing.
                  </p>
                </div>
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Rejection reason</label>
                  <textarea
                    value={sanctumRejectReason}
                    onChange={(e) => setSanctumRejectReason(e.target.value)}
                    placeholder="Why the disbursement is being rejected. Recorded on-chain."
                    rows={2}
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-pink-500 focus:outline-none text-sm"
                  />
                </div>
              </div>
            )}

            {/* EcoTreasuryVault: sendVFIDE template inputs */}
            {templateKey === 'sendVFIDE' && (
              <div className="space-y-3 pl-1 border-l-2 border-yellow-500/20 ml-1">
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Recipient address</label>
                  <input
                    type="text"
                    value={treasurySendTo}
                    onChange={(e) => setTreasurySendTo(e.target.value)}
                    placeholder="0x…"
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-yellow-500 focus:outline-none text-sm font-mono"
                  />
                </div>
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Amount (VFIDE)</label>
                  <input
                    type="number"
                    value={treasurySendAmount}
                    onChange={(e) => setTreasurySendAmount(e.target.value)}
                    placeholder="e.g. 1000"
                    step="0.01"
                    min="0"
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-yellow-500 focus:outline-none text-sm tabular-nums"
                  />
                </div>
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Reason</label>
                  <textarea
                    value={treasurySendReason}
                    onChange={(e) => setTreasurySendReason(e.target.value)}
                    placeholder="Why the treasury is making this disbursement. Recorded on-chain."
                    rows={2}
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-yellow-500 focus:outline-none text-sm"
                  />
                </div>
              </div>
            )}

            {/* EcoTreasuryVault: rescueToken template inputs */}
            {templateKey === 'rescueToken' && (
              <div className="space-y-3 pl-1 border-l-2 border-yellow-500/20 ml-1">
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Token contract address</label>
                  <input
                    type="text"
                    value={treasuryRescueToken}
                    onChange={(e) => setTreasuryRescueToken(e.target.value)}
                    placeholder="0x… (the ERC-20 to recover)"
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-yellow-500 focus:outline-none text-sm font-mono"
                  />
                </div>
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Recipient address</label>
                  <input
                    type="text"
                    value={treasurySendTo}
                    onChange={(e) => setTreasurySendTo(e.target.value)}
                    placeholder="0x…"
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-yellow-500 focus:outline-none text-sm font-mono"
                  />
                </div>
                <div className="pl-3">
                  <label className="block text-xs text-zinc-400 mb-1">Amount (token base units)</label>
                  <input
                    type="text"
                    value={treasuryRescueAmount}
                    onChange={(e) => setTreasuryRescueAmount(e.target.value)}
                    placeholder="e.g. 1000000 for 1 USDC (6 decimals)"
                    className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-yellow-500 focus:outline-none text-sm tabular-nums"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Amount in the token&apos;s smallest unit (wei-equivalent). USDC uses 6 decimals; most ERC-20s use 18.
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
                          ? 'bg-accent/20 text-accent border border-accent/30'
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
                className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-accent focus:outline-none text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Calldata (hex)</label>
              <input
                type="text"
                value={customData}
                onChange={(e) => setCustomData(e.target.value)}
                placeholder="0x…"
                className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-accent focus:outline-none text-xs font-mono"
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
            className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:border-accent focus:outline-none text-sm"
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
          className="mt-6 w-full py-3 rounded-lg bg-accent hover:bg-accent-light disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-sm transition-colors flex items-center justify-center gap-2"
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
              DAO hasn&apos;t enabled this proposal type, submission will revert with a clear policy error.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
