import { Heart, MapPin } from "lucide-react";

export function PhoneMockMarket() {
  return (
    <div className="relative w-[240px] h-[480px] rounded-[40px] bg-[#0a1f44] shadow-[0_40px_100px_-30px_rgba(10,31,68,0.55)] p-2 ring-1 ring-night/20">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 rounded-b-2xl bg-[#0a1f44] z-10" />
      <div className="relative w-full h-full rounded-[32px] bg-[#ffffff] overflow-hidden">
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-[#e6e9f0]/40">
          <h3 className="font-display text-xl text-[#0a1f44]">Marché</h3>
          <span className="text-[10px] text-[#6b7280]">Belleville · 1km</span>
        </div>

        <div className="p-3 grid grid-cols-2 gap-2">
          {ITEMS.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl overflow-hidden bg-[#ffffff] border border-[#e6e9f0]"
            >
              <div
                className={`h-20 ${item.bg} relative flex items-center justify-center text-3xl`}
              >
                {item.emoji}
                <button
                  type="button"
                  aria-label="Ajouter aux favoris"
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#ffffff]/90 flex items-center justify-center"
                >
                  <Heart className="w-3 h-3 text-[#0a1f44]" aria-hidden />
                </button>
              </div>
              <div className="p-2">
                <p className="text-[10px] font-semibold text-[#0a1f44] truncate">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-[#0a1f44]">
                  {item.price}
                </p>
                <p className="mt-0.5 text-[9px] text-[#6b7280] flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" aria-hidden />
                  {item.distance}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="absolute bottom-3 left-3 right-3 h-11 rounded-full bg-[#0a1f44] text-[#fff8e8] flex items-center justify-center text-[11px] font-semibold gap-2 shadow-lg">
          <span className="w-5 h-5 rounded-full bg-[#f4b942] text-[#0a1f44] flex items-center justify-center text-xs font-bold">
            +
          </span>
          Vendre quelque chose
        </div>
      </div>
    </div>
  );
}

const ITEMS = [
  { title: "Tissu wax authentique", price: "12 €", distance: "300 m", emoji: "🧵", bg: "bg-[#f4b942]/30" },
  { title: "Couscoussier en fonte", price: "25 €", distance: "1 km", emoji: "🍲", bg: "bg-emerald-100" },
  { title: "Veste vintage Sape", price: "45 €", distance: "500 m", emoji: "🧥", bg: "bg-[#0a1f44]/10" },
  { title: "Livres scolaires", price: "8 €", distance: "1.2 km", emoji: "📚", bg: "bg-[#fff8e8]" },
];
