import { Plus } from "lucide-react";

type FAQItem = { question: string; answer: string };

export function FAQ({ items }: { items: ReadonlyArray<FAQItem> }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.question}>
          <details className="group rounded-2xl bg-[#ffffff] border border-[#e6e9f0] p-5 [&_summary]:cursor-pointer">
            <summary className="flex items-center justify-between gap-4 list-none">
              <h3 className="font-display text-lg text-[#0a1f44]">{item.question}</h3>
              <span
                aria-hidden
                className="shrink-0 w-8 h-8 rounded-full bg-[#0a1f44]/5 flex items-center justify-center transition-transform group-open:rotate-45"
              >
                <Plus className="w-4 h-4 text-[#0a1f44]" />
              </span>
            </summary>
            <p className="mt-4 text-sm text-[#2a3d6b] leading-relaxed">
              {item.answer}
            </p>
          </details>
        </li>
      ))}
    </ul>
  );
}
