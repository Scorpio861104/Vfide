'use client';

import { useState, useEffect } from "react";
import { isAddress } from "viem";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"; 
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle, XCircle, AlertTriangle, PlayCircle, Loader2 } from "lucide-react";
import { CONTRACT_ADDRESSES, ZERO_ADDRESS, isConfiguredContractAddress } from "@/lib/contracts";
import { useToast } from "@/components/ui/toast";
import { DAOTimelockABI } from "@/lib/abis";

function useNowSeconds(intervalMs: number = 1000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

interface QueuedTransaction {
  id: string;
  target: string;
  value: bigint;
  eta: bigint;
  done: boolean;
  expired: boolean;
}

export function TimelockQueue() {
  const { toast } = useToast();
  const [selectedTx, setSelectedTx] = useState<QueuedTransaction | null>(null);
  const [cancelCandidateTxId, setCancelCandidateTxId] = useState<string | null>(null);
  const isAvailable = isConfiguredContractAddress(CONTRACT_ADDRESSES.DAOTimelock);

  // Read queued transactions
  const { data: queueData, refetch: refetchQueue } = useReadContract({
    address: CONTRACT_ADDRESSES.DAOTimelock,
    abi: DAOTimelockABI,
    functionName: "getQueuedTransactions",
  });

  // Read timelock delay
  const { data: delayData } = useReadContract({
    address: CONTRACT_ADDRESSES.DAOTimelock,
    abi: DAOTimelockABI,
    functionName: "delay",
  });

  const delay = delayData ? Number(delayData) : 48 * 60 * 60; // Default 48 hours

  // Execute transaction
  const { writeContract: executeWrite, data: executeHash, isPending: isExecuting } = useWriteContract();
  const { isLoading: isExecuteConfirming, isSuccess: isExecuteSuccess } = useWaitForTransactionReceipt({ 
    hash: executeHash 
  });

  // Cancel transaction
  const { writeContract: cancelWrite, data: cancelHash, isPending: isCancelling } = useWriteContract();
  const { isLoading: isCancelConfirming, isSuccess: isCancelSuccess } = useWaitForTransactionReceipt({ 
    hash: cancelHash 
  });

  useEffect(() => {
    if (isExecuteSuccess) {
      toast({
        title: "Transaction Executed",
        description: "The queued transaction has been executed successfully.",
      });
      refetchQueue();
      setTimeout(() => setSelectedTx(null), 0);
    }
  }, [isExecuteSuccess, toast, refetchQueue]);

  useEffect(() => {
    if (isCancelSuccess) {
      toast({
        title: "Transaction Cancelled",
        description: "The queued transaction has been cancelled.",
      });
      refetchQueue();
      setTimeout(() => setSelectedTx(null), 0);
    }
  }, [isCancelSuccess, toast, refetchQueue]);

  // Type assertion for JSON ABI return value
  const queueDataTuple = queueData as readonly [readonly string[], readonly string[], readonly bigint[], readonly bigint[], readonly boolean[], readonly boolean[]] | undefined;
  const transactions: QueuedTransaction[] = queueDataTuple
    ? queueDataTuple[0].map((id, i) => ({
        id,
        target: queueDataTuple[1][i] ?? '',
        value: queueDataTuple[2][i] ?? BigInt(0),
        eta: queueDataTuple[3][i] ?? BigInt(0),
        done: queueDataTuple[4][i] ?? false,
        expired: queueDataTuple[5][i] ?? false,
      }))
    : [];

  const handleExecute = (txId: string) => {
    if (!isAvailable) {
      toast({
        title: "Timelock Unavailable",
        description: "DAOTimelock is not configured in this environment.",
      });
      return;
    }
    if (!isAddress(txId) || txId.toLowerCase() === ZERO_ADDRESS) {
      toast({
        title: "Invalid Transaction ID",
        description: "Queued transaction ID must be a valid non-zero hash address value.",
      });
      return;
    }
    executeWrite({
      address: CONTRACT_ADDRESSES.DAOTimelock,
      abi: DAOTimelockABI,
      functionName: "execute",
      args: [txId as `0x${string}`],
    });
  };

  const handleCancel = (txId: string) => {
    if (!isAvailable) {
      toast({
        title: "Timelock Unavailable",
        description: "DAOTimelock is not configured in this environment.",
      });
      return;
    }
    if (!isAddress(txId) || txId.toLowerCase() === ZERO_ADDRESS) {
      toast({
        title: "Invalid Transaction ID",
        description: "Queued transaction ID must be a valid non-zero hash address value.",
      });
      return;
    }
    cancelWrite({
      address: CONTRACT_ADDRESSES.DAOTimelock,
      abi: DAOTimelockABI,
      functionName: "cancel",
      args: [txId as `0x${string}`],
    });
  };

  return (
    <>
      {/* Loading Overlay */}
      <AnimatePresence>
        {(isExecuting || isExecuteConfirming || isCancelling || isCancelConfirming) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
              <div className="text-xl font-bold text-white">
                {isExecuting || isCancelling ? 'Confirm in Wallet...' : 'Processing Transaction...'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
              <Clock className="w-6 h-6 text-cyan-400" />
              Timelock Queue
            </h3>
            <p className="text-zinc-400 text-sm mt-1">
              Approved proposals must wait {delay / 3600}h before execution
            </p>
          </div>
          <div className="text-right">
            <div className="text-zinc-400 text-sm">Queued Transactions</div>
            <div className="text-2xl font-bold text-cyan-400">{transactions.length}</div>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No transactions in the queue</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <TransactionCard
                key={tx.id}
                tx={tx}
                onExecute={handleExecute}
                onRequestCancel={setCancelCandidateTxId}
                onSelect={setSelectedTx}
              />
            ))}
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <TransactionDetailModal
          tx={selectedTx}
          onClose={() => setSelectedTx(null)}
          onExecute={handleExecute}
          onRequestCancel={(txId) => {
            setCancelCandidateTxId(txId);
            setSelectedTx(null);
          }}
        />
      )}

      {cancelCandidateTxId && (
        <CancelConfirmModal
          txId={cancelCandidateTxId}
          onClose={() => setCancelCandidateTxId(null)}
          onConfirm={() => {
            handleCancel(cancelCandidateTxId);
            setCancelCandidateTxId(null);
          }}
        />
      )}
    </>
  );
}

function TransactionCard({
  tx,
  onExecute,
  onRequestCancel,
  onSelect,
}: {
  tx: QueuedTransaction;
  onExecute: (id: string) => void;
  onRequestCancel: (id: string) => void;
  onSelect: (tx: QueuedTransaction) => void;
}) {
  const now = useNowSeconds();
  const eta = Number(tx.eta);
  const timeUntilExecutable = eta - now;
  const isExecutable = timeUntilExecutable <= 0 && !tx.done && !tx.expired;
  const isPending = timeUntilExecutable > 0 && !tx.done && !tx.expired;

  const getStatusInfo = () => {
    if (tx.done) return { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Executed" };
    if (tx.expired) return { icon: XCircle, color: "text-red-600", bg: "bg-red-600/10", label: "Expired" };
    if (isExecutable) return { icon: PlayCircle, color: "text-cyan-400", bg: "bg-cyan-400/10", label: "Ready" };
    return { icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", label: "Pending" };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 4 }}
      className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 hover:border-cyan-400/50 transition-all cursor-pointer"
      onClick={() => onSelect(tx)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${status.bg}`}>
            <StatusIcon className={`w-5 h-5 ${status.color}`} />
          </div>
          <div>
            <div className="text-zinc-100 font-bold">Transaction #{tx.id.slice(0, 10)}...</div>
            <div className="text-zinc-400 text-sm">Target: {tx.target.slice(0, 10)}...</div>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-lg ${status.bg}`}>
          <span className={`text-sm font-bold ${status.color}`}>{status.label}</span>
        </div>
      </div>

      {isPending && (
        <div className="mb-3">
          <div className="flex justify-between text-sm text-zinc-400 mb-1">
            <span>Time until executable</span>
            <span className="text-amber-400 font-bold">
              <Countdown timestamp={eta} />
            </span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-cyan-400 transition-all duration-1000"
              style={{ width: `${Math.min(100, ((now - (eta - 48 * 3600)) / (48 * 3600)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {isExecutable && (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExecute(tx.id);
            }}
            className="flex-1 px-4 py-2 bg-cyan-400 text-zinc-900 rounded-lg font-bold hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-4 h-4" />
            Execute
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRequestCancel(tx.id);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </motion.div>
  );
}

function TransactionDetailModal({
  tx,
  onClose,
  onExecute,
  onRequestCancel,
}: {
  tx: QueuedTransaction;
  onClose: () => void;
  onExecute: (id: string) => void;
  onRequestCancel: (id: string) => void;
}) {
  const now = useNowSeconds();
  const eta = Number(tx.eta);
  const isExecutable = eta <= now && !tx.done && !tx.expired;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-800 border border-zinc-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-zinc-700 flex items-center justify-between">
          <h3 className="text-xl font-bold text-zinc-100">Transaction Details</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 text-2xl">
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <div className="text-zinc-400 text-sm mb-1">Transaction ID</div>
            <div className="text-zinc-100 font-mono text-sm break-all">{tx.id}</div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-1">Target Contract</div>
            <div className="text-cyan-400 font-mono text-sm break-all">{tx.target}</div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-1">Value</div>
            <div className="text-zinc-100 font-bold">{(Number(tx.value) / 1e18).toFixed(4)} ETH</div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-1">Execution Time (ETA)</div>
            <div className="text-zinc-100">{new Date(Number(tx.eta) * 1000).toLocaleString()}</div>
          </div>

          <div>
            <div className="text-zinc-400 text-sm mb-1">Status</div>
            <div className="flex items-center gap-2">
              {tx.done && <span className="px-3 py-1 bg-emerald-500/20 text-emerald-500 rounded-lg font-bold">✓ Executed</span>}
              {tx.expired && <span className="px-3 py-1 bg-red-600/20 text-red-600 rounded-lg font-bold">✗ Expired</span>}
              {!tx.done && !tx.expired && isExecutable && (
                <span className="px-3 py-1 bg-cyan-400/20 text-cyan-400 rounded-lg font-bold">▶ Ready to Execute</span>
              )}
              {!tx.done && !tx.expired && !isExecutable && (
                <span className="px-3 py-1 bg-amber-400/20 text-amber-400 rounded-lg font-bold">⏳ Pending</span>
              )}
            </div>
          </div>

          {!tx.done && !tx.expired && !isExecutable && (
            <div className="bg-amber-400/10 border border-amber-400 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold">Time Lock Active</span>
              </div>
              <div className="text-zinc-100 text-sm">
                This transaction will be executable in <span className="font-bold text-amber-400"><Countdown timestamp={eta} /></span>
              </div>
            </div>
          )}

          {isExecutable && (
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  onExecute(tx.id);
                  onClose();
                }}
                className="flex-1 px-6 py-3 bg-cyan-400 text-zinc-900 rounded-lg font-bold hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-5 h-5" />
                Execute Transaction
              </button>
              <button
                onClick={() => {
                  onRequestCancel(tx.id);
                }}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function CancelConfirmModal({
  txId,
  onClose,
  onConfirm,
}: {
  txId: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-800 border border-zinc-700 rounded-xl max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-zinc-100 mb-3">Cancel Timelock Transaction</h3>
        <p className="text-zinc-300 text-sm mb-2">You are about to cancel a queued governance transaction.</p>
        <p className="text-zinc-400 text-xs break-all mb-6">Transaction: {txId}</p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-zinc-600 text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            Keep Queued
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
          >
            Confirm Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Countdown({ timestamp }: { timestamp: number }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = timestamp - now;

      if (diff <= 0) {
        setTimeLeft("Ready");
        return;
      }

      const days = Math.floor(diff / (24 * 60 * 60));
      const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((diff % (60 * 60)) / 60);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [timestamp]);

  return <>{timeLeft}</>;
}
