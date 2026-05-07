import { Avatar } from "@/components/ui/Avatar";

type Tone = "light" | "dark";

const FRAMES = {
  light: {
    frame: "bg-night",
    screen: "bg-gradient-to-b from-cream via-bg to-bg",
    title: "text-night",
    accent: "bg-gold",
    text: "text-night",
  },
  dark: {
    frame: "bg-night",
    screen: "bg-gradient-to-b from-night-soft via-night to-night",
    title: "text-cream",
    accent: "bg-gold",
    text: "text-cream",
  },
} as const;

export function PhoneMockChat({ tone = "light" }: { tone?: Tone }) {
  const t = FRAMES[tone];
  return (
    <div
      className={`relative w-[260px] h-[520px] rounded-[44px] ${t.frame} shadow-[0_40px_100px_-30px_rgba(10,31,68,0.55)] p-2 ring-1 ring-night/20`}
    >
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 rounded-b-2xl bg-night z-10" />
      <div
        className={`relative w-full h-full rounded-[36px] ${t.screen} overflow-hidden`}
      >
        <div
          className={`px-6 pt-4 pb-2 flex items-center justify-between text-[10px] font-semibold ${
            tone === "dark" ? "text-cream/70" : "text-night/70"
          }`}
        >
          <span>9:41</span>
          <span className="flex gap-1">
            <span
              className={`w-3 h-1.5 rounded-sm ${tone === "dark" ? "bg-cream/40" : "bg-night/40"}`}
            />
            <span
              className={`w-3 h-1.5 rounded-sm ${tone === "dark" ? "bg-cream/40" : "bg-night/40"}`}
            />
            <span
              className={`w-4 h-1.5 rounded-sm ${tone === "dark" ? "bg-cream" : "bg-night"}`}
            />
          </span>
        </div>

        <div className="px-5 pt-3 pb-3 flex items-center gap-3 border-b border-line/30">
          <Avatar src={null} fullName="Aïssatou Diop" size="md" />
          <div className="flex-1">
            <p className={`font-semibold text-sm ${t.text}`}>Aïssatou Diop</p>
            <p
              className={`text-[10px] ${tone === "dark" ? "text-emerald-300" : "text-emerald-600"} flex items-center gap-1`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{" "}
              en ligne
            </p>
          </div>
        </div>

        <div className="px-4 py-4 space-y-3 overflow-hidden">
          <ChatBubble side="left" tone={tone}>
            Tu es à Belleville cet après-midi ?
          </ChatBubble>
          <ChatBubble side="left" tone={tone}>
            J&apos;ai trouvé un atelier qui vend exactement le tissu que tu
            cherchais 🧵
          </ChatBubble>
          <ChatBubble side="right" tone={tone}>
            Sérieux ?? Tu m&apos;envoies l&apos;adresse !
          </ChatBubble>
          <ChatBubble side="right" tone={tone}>
            Je passe à 16h
          </ChatBubble>
          <div className="flex justify-start">
            <div
              className={`px-3 py-2 rounded-2xl ${tone === "dark" ? "bg-night-muted" : "bg-night/5"} flex items-center gap-1`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              <span
                className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"
                style={{ animationDelay: "0.2s" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </div>
        </div>

        <div className="absolute bottom-3 left-3 right-3 h-12 rounded-full bg-white/90 backdrop-blur-sm border border-line flex items-center px-4 gap-3">
          <span className="text-xs text-muted flex-1">Écris un message…</span>
          <span className="w-7 h-7 rounded-full bg-night text-cream flex items-center justify-center text-xs font-bold">
            ↑
          </span>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  children,
  side,
  tone,
}: {
  children: React.ReactNode;
  side: "left" | "right";
  tone: Tone;
}) {
  const isLeft = side === "left";
  const styles = isLeft
    ? tone === "dark"
      ? "bg-night-muted text-cream"
      : "bg-white text-night border border-line"
    : "bg-night text-cream";

  return (
    <div className={`flex ${isLeft ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs leading-snug ${styles} ${
          isLeft ? "rounded-bl-md" : "rounded-br-md"
        } shadow-sm`}
      >
        {children}
      </div>
    </div>
  );
}
