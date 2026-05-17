import { Check } from "lucide-react";

export function PaymentReceipt() {
  return (
    <div className="w-[280px] rounded-3xl bg-white border border-[#e6e9f0] shadow-[0_30px_80px_-30px_rgba(10,31,68,0.4)] overflow-hidden">
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-[#fff8e8]">
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Check className="w-5 h-5" aria-hidden />
        </div>
        <p className="mt-4 text-xs uppercase tracking-widest opacity-80">
          Transfert reçu
        </p>
        <p className="mt-1 font-display text-3xl">+ 50 000 XAF</p>
        <p className="text-xs opacity-80">≈ 76,30 €</p>
      </div>
      <div className="p-5 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[#6b7280]">De</span>
          <span className="font-semibold text-[#0a1f44]">Maman 🌹</span>
        </div>
        <div className="flex items-center justify-between border-t border-[#e6e9f0] pt-3">
          <span className="text-[#6b7280]">Méthode</span>
          <span className="font-medium text-[#0a1f44] text-right">
            Orange Money <br />
            <span className="text-[10px] text-[#6b7280]">→ Wave Sénégal</span>
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-[#e6e9f0] pt-3">
          <span className="text-[#6b7280]">Reçu en</span>
          <span className="font-medium text-[#0a1f44]">3 secondes</span>
        </div>
        <div className="flex items-center justify-between border-t border-[#e6e9f0] pt-3">
          <span className="text-[#6b7280]">Frais</span>
          <span className="font-bold text-emerald-700">Gratuit</span>
        </div>
      </div>
    </div>
  );
}
