type MarqueeProps = {
  items: string[];
  className?: string;
};

export function Marquee({ items, className }: MarqueeProps) {
  const doubled = [...items, ...items];

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-bg to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-bg to-transparent z-10 pointer-events-none" />
      <div className="flex gap-12 animate-marquee whitespace-nowrap py-4">
        {doubled.map((item, idx) => (
          <span
            key={`${item}-${idx}`}
            className="font-display text-3xl sm:text-4xl text-[#0a1f44]/40 hover:text-[#0a1f44] transition-colors"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
