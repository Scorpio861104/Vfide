'use client';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqTabProps {
  search: string;
  items: FaqItem[];
  openQuestion: string | null;
  onSearchChange: (value: string) => void;
  onToggleQuestion: (question: string) => void;
}

export function FaqTab({ search, items, openQuestion, onSearchChange, onToggleQuestion }: FaqTabProps) {
  return (
    <div className="space-y-4">
      <input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search for answers"
        className="w-full rounded-2xl border border-white/10 bg-white/3 px-4 py-3 text-white placeholder:text-gray-500"
      />

      {items.map((item) => (
        <div key={item.question} className="rounded-2xl border border-white/10 bg-white/3 p-4">
          <button
            type="button"
            onClick={() => onToggleQuestion(item.question)}
            className="w-full text-left text-white font-semibold"
          >
            {item.question}
          </button>
          {openQuestion === item.question ? (
            <p className="text-gray-400 mt-3">{item.answer}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
