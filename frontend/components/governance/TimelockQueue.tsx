"use client";

import { useState, useEffect } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"; 
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle, XCircle, AlertTriangle, PlayCircle, Loader2 } from "lucide-react";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import { useToast } from "@/components/ui/toast";

const TIMELOCK_ABI = [
  {
    inputs: [],
    name: "getQueuedTransactions",
    outputs: [
      { name: "ids", type: "bytes32[]" },
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "etas", type: "uint64[]" },
      { name: "done", type: "bool[]" },
      { name: "expired", type: "bool[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "id", type: "bytes32" }],
    name: "execute",
    outputs: [{ name: "res", type: "bytes" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "id", type: "bytes32" }],
    name: "cancel",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "delay",
    outputs: [{ name: "", type: "uint64" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

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

  // Read queued transactions
  const { data: queueData, refetch: refetchQueue } = useReadContract({
    address: CONTRACT_ADDRESSES.DAOTimelock,
    abi: TIMELOCK_ABI,
    functionName: "getQueuedTransactions",
  });

  // Read timelock delay
  const { data: delayData } = useReadContract({
    address: CONTRACT_ADDRESSES.DAOTimelock,
    abi: TIMELOCK_ABI,
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

  const transactions: QueuedTransaction[] = queueData
    ? (queueData[0] as readonly string[]).map((id, i) => ({
        id,
        target: (queueData[1] as readonly string[])[i],
        value: (queueData[2] as readonly bigint[])[i],
        eta: (queueData[3] as readonly bigint[])[i],
        done: (queueData[4] as readonly boolean[])[i],
        expired: (queueData[5] as readonly boolean[])[i],
      }))
    : [];

  const handleExecute = (txId: string) => {
    executeWrite({
      address: CONTRACT_ADDRESSES.DAOTimelock,
      abi: TIMELOCK_ABI,
      functionName: "execute",
      args: [txId as `0x${string}`],
    });
  };

  const handleCancel = (txId: string) => {
    cancelWrite({
      address: CONTRACT_ADDRESSES.DAOTimelock,
      abi: TIMELOCK_ABI,
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
            <div className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-xl p-8 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-[#00F0FF] animate-spin" />
              <div className="text-xl font-bold text-white">
                {isExecuting || isCancelling ? 'Confirm in Wallet...' : 'Processing Transaction...'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-[#F5F3E8] flex items-center gap-2">
              <Clock className="w-6 h-6 text-[#00F0FF]" />
              Timelock Queue
            </h3>
            <p className="text-[#A0A0A5] text-sm mt-1">
              Approved proposals must wait {delay / 3600}h before execution
            </p>
          </div>
          <div className="text-right">
            <div className="text-[#A0A0A5] text-sm">Queued Transactions</div>
            <div className="text-2xl font-bold text-[#00F0FF]">{transactions.length}</div>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12 text-[#A0A0A5]">
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
                onCancel={handleCancel}
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
          onCancel={handleCancel}
        />
      )}
    </>
  );
}

function TransactionCard({
  tx,
  onExecute,
  onCancel,
  onSelect,
}: {
  tx: QueuedTransaction;
  onExecute: (id: string) => void;
  onCancel: (id: string) => void;
  onSelect: (tx: QueuedTransaction) => void;
}) {
  const now = useNowSeconds();
  const eta = Number(tx.eta);
  const timeUntilExecutable = eta - now;
  const isExecutable = timeUntilExecutable <= 0 && !tx.done && !tx.expired;
  const isPending = timeUntilExecutable > 0 && !tx.done && !tx.expired;

  const getStatusInfo = () => {
    if (tx.done) return { icon: CheckCircle, color: "text-[#50C878]", bg: "bg-[#50C878]/10", label: "Executed" };
    if (tx.expired) return { icon: XCircle, color: "text-[#C41E3A]", bg: "bg-[#C41E3A]/10", label: "Expired" };
    if (isExecutable) return { icon: PlayCircle, color: "text-[#00F0FF]", bg: "bg-[#00F0FF]/10", label: "Ready" };
    return { icon: Clock, color: "text-[#FFD700]", bg: "bg-[#FFD700]/10", label: "Pending" };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 4 }}
      className="bg-[#1A1A1D] border border-[#3A3A3F] rounded-xl p-4 hover:border-[#00F0FF]/50 transition-all cursor-pointer"
      onClick={() => onSelect(tx)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${status.bg}`}>
            <StatusIcon className={`w-5 h-5 ${status.color}`} />
          </div>
          <div>
            <div className="text-[#F5F3E8] font-bold">Transaction #{tx.id.slice(0, 10)}...</div>
            <div className="text-[#A0A0A5] text-sm">Target: {tx.target.slice(0, 10)}...</div>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-lg ${status.bg}`}>
          <span className={`text-sm font-bold ${status.color}`}>{status.label}</span>
        </div>
      </div>

      {isPending && (
        <div className="mb-3">
          <div className="flex justify-between text-sm text-[#A0A0A5] mb-1">
            <span>Time until executable</span>
            <span className="text-[#FFD700] font-bold">
              <Countdown timestamp={eta} />
            </span>
          </div>
          <div className="w-full h-2 bg-[#2A2A2F] rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-[#FFD700] to-[#00F0FF] transition-all duration-1000"
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
            className="flex-1 px-4 py-2 bg-[#00F0FF] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#00D8E8] transition-colors flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-4 h-4" />
            Execute
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Are you sure you want to cancel this transaction?")) {
                onCancel(tx.id);
              }
            }}
            className="px-4 py-2 bg-[#C41E3A] text-white rounded-lg font-bold hover:bg-[#A01828] transition-colors"
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
  onCancel,
}: {
  tx: QueuedTransaction;
  onClose: () => void;
  onExecute: (id: string) => void;
  onCancel: (id: string) => void;
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
        className="bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#3A3A3F] flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#F5F3E8]">Transaction Details</h3>
          <button onClick={onClose} className="text-[#A0A0A5] hover:text-[#F5F3E8] text-2xl">
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <div className="text-[#A0A0A5] text-sm mb-1">Transaction ID</div>
            <div className="text-[#F5F3E8] font-mono text-sm break-all">{tx.id}</div>
          </div>

          <div>
            <div className="text-[#A0A0A5] text-sm mb-1">Target Contract</div>
            <div className="text-[#00F0FF] font-mono text-sm break-all">{tx.target}</div>
          </div>

          <div>
            <div className="text-[#A0A0A5] text-sm mb-1">Value</div>
            <div className="text-[#F5F3E8] font-bold">{(Number(tx.value) / 1e18).toFixed(4)} ETH</div>
          </div>

          <div>
            <div className="text-[#A0A0A5] text-sm mb-1">Execution Time (ETA)</div>
            <div className="text-[#F5F3E8]">{new Date(Number(tx.eta) * 1000).toLocaleString()}</div>
          </div>

          <div>
            <div className="text-[#A0A0A5] text-sm mb-1">Status</div>
            <div className="flex items-center gap-2">
              {tx.done && <span className="px-3 py-1 bg-[#50C878]/20 text-[#50C878] rounded-lg font-bold">✓ Executed</span>}
              {tx.expired && <span className="px-3 py-1 bg-[#C41E3A]/20 text-[#C41E3A] rounded-lg font-bold">✗ Expired</span>}
              {!tx.done && !tx.expired && isExecutable && (
                <span className="px-3 py-1 bg-[#00F0FF]/20 text-[#00F0FF] rounded-lg font-bold">▶ Ready to Execute</span>
              )}
              {!tx.done && !tx.expired && !isExecutable && (
                <span className="px-3 py-1 bg-[#FFD700]/20 text-[#FFD700] rounded-lg font-bold">⏳ Pending</span>
              )}
            </div>
          </div>

          {!tx.done && !tx.expired && !isExecutable && (
            <div className="bg-[#FFD700]/10 border border-[#FFD700] rounded-lg p-4">
              <div className="flex items-center gap-2 text-[#FFD700] mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold">Time Lock Active</span>
              </div>
              <div className="text-[#F5F3E8] text-sm">
                This transaction will be executable in <span className="font-bold text-[#FFD700]"><Countdown timestamp={eta} /></span>
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
                className="flex-1 px-6 py-3 bg-[#00F0FF] text-[#1A1A1D] rounded-lg font-bold hover:bg-[#00D8E8] transition-colors flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-5 h-5" />
                Execute Transaction
              </button>
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to cancel this transaction?")) {
                    onCancel(tx.id);
                    onClose();
                  }
                }}
                className="px-6 py-3 bg-[#C41E3A] text-white rounded-lg font-bold hover:bg-[#A01828] transition-colors"
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
