import { Avatar } from "@/components/ui/Avatar";

export function PhoneMock() {
  return (
    <div className="relative w-[260px] h-[520px] rounded-[44px] bg-night shadow-[0_40px_100px_-30px_rgba(10,31,68,0.55)] p-2 ring-1 ring-night/20">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 rounded-b-2xl bg-night z-10" />
      <div className="relative w-full h-full rounded-[36px] bg-gradient-to-b from-cream via-bg to-bg overflow-hidden">
        {/* Status bar */}
        <div className="px-6 pt-4 pb-2 flex items-center justify-between text-[10px] font-semibold text-night/70">
          <span>9:41</span>
          <span className="flex gap-1">
            <span className="w-3 h-1.5 rounded-sm bg-night/40" />
            <span className="w-3 h-1.5 rounded-sm bg-night/40" />
            <span className="w-4 h-1.5 rounded-sm bg-night" />
          </span>
        </div>

        {/* App header */}
        <div className="px-5 pt-4 flex items-center justify-between">
          <h3 className="font-display text-2xl text-night">Discussions</h3>
          <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center text-night font-bold text-sm">
            D
          </div>
        </div>

        {/* Search */}
        <div className="px-5 mt-3">
          <div className="h-9 rounded-full bg-night/5 border border-line flex items-center px-3 text-xs text-muted">
            Rechercher un contact, un message…
          </div>
        </div>

        {/* Chat list */}
        <div className="mt-4 space-y-1 px-3">
          {chats.map((chat, idx) => (
            <div
              key={chat.name}
              className={`flex items-center gap-3 p-2.5 rounded-2xl ${
                idx === 0 ? "bg-night/[0.04]" : ""
              }`}
            >
              <Avatar
                src={null}
                fullName={chat.name}
                size="md"
                className={idx === 0 ? "ring-2 ring-gold/60" : ""}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-night text-sm truncate">
                    {chat.name}
                  </span>
                  <span className="text-[10px] text-muted shrink-0 ml-2">
                    {chat.time}
                  </span>
                </div>
                <p className="text-xs text-muted truncate mt-0.5">
                  {chat.message}
                </p>
              </div>
              {chat.unread ? (
                <span className="ml-1 w-5 h-5 rounded-full bg-night text-cream text-[10px] font-bold flex items-center justify-center">
                  {chat.unread}
                </span>
              ) : null}
            </div>
          ))}
        </div>

        {/* Bottom nav */}
        <div className="absolute bottom-3 left-3 right-3 h-14 rounded-2xl bg-night text-cream flex items-center justify-around shadow-lg">
          {["Chat", "Marché", "+", "Emploi", "Profil"].map((label) => (
            <span
              key={label}
              className={`text-[10px] font-semibold ${
                label === "+"
                  ? "w-10 h-10 rounded-full bg-gold text-night flex items-center justify-center text-2xl leading-none -mt-1"
                  : ""
              } ${label === "Chat" ? "text-gold" : ""}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const chats = [
  {
    name: "Aïssatou D.",
    message: "Tu peux passer chercher le colis ce soir ?",
    time: "14:32",
    unread: 2,
  },
  {
    name: "Famille 🏡",
    message: "Maman : N'oublie pas le mariage 💍",
    time: "13:58",
    unread: 5,
  },
  {
    name: "Yann Mvondo",
    message: "Vu ton annonce, ça m'intéresse !",
    time: "12:10",
  },
  {
    name: "Marché Belleville",
    message: "Nouveau vendeur : Tissu wax premium",
    time: "10:44",
  },
];
