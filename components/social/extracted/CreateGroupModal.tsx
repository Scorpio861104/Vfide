'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function CreateGroupModal({ onClose, onCreate, userAddress }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('👥');
  const [color, setColor] = useState('#00F0FF');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    // Load friends
    const stored = safeLocalStorage.getItem(`vfide_friends_${userAddress}`);
    if (stored) {
      setFriends(JSON.parse(stored));
    }
  }, [userAddress]);

  const handleCreate = () => {
    if (!name.trim() || selectedFriends.length === 0) {
      alert('Please enter a group name and select at least one member');
      return;
    }

    void onCreate({
      name,
      description,
      icon,
      color,
      memberAddresses: selectedFriends,
    });
  };

  const icons = ['👥', '💼', '🎮', '📚', '🏠', '🎨', '⚽', '🍕'];
  const colors = ['#00F0FF', '#A78BFA', '#FFD700', '#50C878', '#FF8C42', '#FF6B9D'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 rounded-xl border border-zinc-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-zinc-100">Create Group</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Icon & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-100 mb-2">Icon</label>
              <div className="grid grid-cols-4 gap-2">
                {icons.map(i => (
                  <button
                    key={i}
                    onClick={() => setIcon(i)}
                    className={`p-3 text-2xl rounded-lg transition-all ${
                      icon === i ? 'bg-cyan-400/20 border-2 border-cyan-400' : 'bg-zinc-950 border-2 border-transparent hover:bg-zinc-800'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-100 mb-2">Color</label>
              <div className="grid grid-cols-3 gap-2">
                {colors.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-12 rounded-lg transition-all ${
                      color === c ? 'ring-2 ring-zinc-100 ring-offset-2 ring-offset-[#1A1A2E]' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-zinc-100 mb-2">Group Name*</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Team Alpha"
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-zinc-100 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={2}
              className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:border-cyan-400 focus:outline-none resize-none"
            />
          </div>

          {/* Select Members */}
          <div>
            <label className="block text-sm font-semibold text-zinc-100 mb-2">
              Add Members* ({selectedFriends.length} selected)
            </label>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {friends.map(friend => (
                <label
                  key={friend.address}
                  className="flex items-center gap-3 p-3 bg-zinc-950 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedFriends.includes(friend.address)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFriends([...selectedFriends, friend.address]);
                      } else {
                        setSelectedFriends(selectedFriends.filter(a => a !== friend.address));
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-violet-400 flex items-center justify-center text-xs font-bold">
                    {(friend.alias || friend.address).slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-zinc-100">
                    {friend.alias || formatAddress(friend.address)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleCreate}
              className="flex-1 py-3 bg-cyan-400 text-zinc-950 rounded-lg font-bold hover:bg-cyan-400 transition-colors"
            >
              Create Group
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-zinc-800 text-zinc-100 rounded-lg font-semibold hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
