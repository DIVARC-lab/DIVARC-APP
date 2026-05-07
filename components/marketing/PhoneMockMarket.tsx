import { Heart, MapPin } from "lucide-react";

export function PhoneMockMarket() {
  return (
    <div className="relative w-[240px] h-[480px] rounded-[40px] bg-night shadow-[0_40px_100px_-30px_rgba(10,31,68,0.55)] p-2 ring-1 ring-night/20">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 rounded-b-2xl bg-night z-10" />
      <div className="relative w-full h-full rounded-[32px] bg-bg overflow-hidden">
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-line/40">
          <h3 className="font-display text-xl text-night">Marché</h3>
          <span className="text-[10px] text-muted">Belleville · 1km</span>
        </div>

        <div className="p-3 grid grid-cols-2 gap-2">
          {ITEMS.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl overflow-hidden bg-white border border-line"
            >
              <div
                className={`h-20 ${item.bg} relative flex items-center justify-center text-3xl`}
              >
                {item.emoji}
                <button
                  type="button"
                  aria-label="Ajouter aux favoris"
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center"
                >
                  <Heart className="w-3 h-3 text-night" aria-hidden />
                </button>
              </div>
              <div className="p-2">
                <p className="text-[10px] font-semibold text-night truncate">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-night">
                  {item.price}
                </p>
                <p className="mt-0.5 text-[9px] text-muted flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" aria-hidden />
                  {item.distance}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="absolute bottom-3 left-3 right-3 h-11 rounded-full bg-night text-cream flex items-center justify-center text-[11px] font-semibold gap-2 shadow-lg">
          <span className="w-5 h-5 rounded-full bg-gold text-night flex items-center justify-center text-xs font-bold">
            +
          </span>
          Vendre quelque chose
        </div>
      </div>
    </div>
  );
}

const ITEMS = [
  { title: "Tissu wax authentique", price: "12 €", distance: "300 m", emoji: "🧵", bg: "bg-gold/30" },
  { title: "Couscoussier en fonte", price: "25 €", distance: "1 km", emoji: "🍲", bg: "bg-emerald-100" },
  { title: "Veste vintage Sape", price: "45 €", distance: "500 m", emoji: "🧥", bg: "bg-night/10" },
  { title: "Livres scolaires", price: "8 €", distance: "1.2 km", emoji: "📚", bg: "bg-cream" },
];
