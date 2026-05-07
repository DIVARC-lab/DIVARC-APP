import { MapPin, Quote } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

type PersonaCardProps = {
  name: string;
  role: string;
  city: string;
  quote: string;
  accent?: "night" | "gold" | "cream";
};

const ACCENTS = {
  night: {
    bg: "bg-night text-cream",
    quote: "text-gold",
    role: "text-cream/60",
  },
  gold: {
    bg: "bg-gradient-to-br from-cream to-gold/20 text-night border border-gold/30",
    quote: "text-gold-deep",
    role: "text-night-muted",
  },
  cream: {
    bg: "bg-white text-night border border-line",
    quote: "text-night-muted",
    role: "text-muted",
  },
} as const;

export function PersonaCard({
  name,
  role,
  city,
  quote,
  accent = "cream",
}: PersonaCardProps) {
  const a = ACCENTS[accent];

  return (
    <article className={`relative p-7 rounded-3xl ${a.bg}`}>
      <Quote
        className={`absolute top-6 right-6 w-8 h-8 ${a.quote} opacity-40`}
        aria-hidden
      />
      <p className="font-display text-xl leading-snug text-pretty">
        « {quote} »
      </p>
      <div className="mt-7 flex items-center gap-3">
        <Avatar src={null} fullName={name} size="md" />
        <div className="leading-tight">
          <p className="font-semibold text-base">{name}</p>
          <p className={`text-xs ${a.role}`}>
            {role} · <MapPin className="inline w-3 h-3 mb-0.5" /> {city}
          </p>
        </div>
      </div>
    </article>
  );
}
