// Shared mock data, icons and primitives for the DIVARC feed redesign.
// Uses tokens from app/globals.css (navy, gold, cream, line…).

// ─────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────
const STORIES = [
  { id: 's-self', name: 'Toi', initials: 'AM', isSelf: true },
  { id: 's1', name: 'Aïssata', initials: 'AC', unviewed: true, hue: 38 },
  { id: 's2', name: 'Yann', initials: 'YL', unviewed: true, hue: 220 },
  { id: 's3', name: 'Fatou', initials: 'FB', unviewed: true, hue: 350 },
  { id: 's4', name: 'Léo', initials: 'LM', unviewed: false, hue: 160 },
  { id: 's5', name: 'Mariam', initials: 'MD', unviewed: true, hue: 280 },
  { id: 's6', name: 'Karim', initials: 'KS', unviewed: false, hue: 20 },
];

const POSTS = [
  {
    id: 'p1',
    author: 'Aïssata Coulibaly',
    handle: 'aissata',
    initials: 'AC',
    avatarHue: 38,
    visibility: 'friends',
    time: 'il y a 14 min',
    body: 'Première session photo dans l\u2019atelier ce week-end. La lumière du matin, c\u2019est vraiment autre chose. Mention spéciale à @yann pour les conseils.',
    photos: [
      { kind: 'gradient', a: '#f4b942', b: '#b88a2a', c: '#0a1f44' },
      { kind: 'gradient', a: '#fff8e8', b: '#f8cd76', c: '#142a55' },
    ],
    likes: 24,
    liked: true,
    comments: 4,
  },
  {
    id: 'p2',
    author: 'Yann Mbaye',
    handle: 'yann',
    initials: 'YL',
    avatarHue: 220,
    visibility: 'public',
    time: 'il y a 1 h',
    body: 'On cherche un·e dev React pour rejoindre l\u2019équipe à Dakar. Ambiance studio, projets long-terme, vrais utilisateurs. DM ouvert.',
    photos: [],
    likes: 41,
    liked: false,
    comments: 12,
    pill: 'Annonce emploi',
  },
  {
    id: 'p3',
    author: 'Fatou Bamba',
    handle: 'fatou',
    initials: 'FB',
    avatarHue: 350,
    visibility: 'friends',
    time: 'il y a 3 h',
    body: 'Je revends la machine à café que j\u2019ai jamais utilisée. État neuf, encore sous garantie. Premier·e qui passe la prend.',
    photos: [
      { kind: 'gradient', a: '#fff8e8', b: '#e6e9f0', c: '#142a55' },
    ],
    likes: 8,
    liked: false,
    comments: 2,
    pill: 'Marché',
  },
  {
    id: 'p4',
    author: 'Léo Martin',
    handle: 'leom',
    initials: 'LM',
    avatarHue: 160,
    visibility: 'friends',
    time: 'il y a 6 h',
    body: 'Petite pensée du matin. La discipline ne demande pas qu\u2019on soit parfait, juste qu\u2019on revienne.',
    photos: [],
    likes: 67,
    liked: true,
    comments: 9,
  },
];

const COMMENTS = [
  { id: 'c1', author: 'Yann Mbaye', initials: 'YL', hue: 220, time: 'il y a 8 min', body: 'Magnifique cadrage 🙌 t\u2019as utilisé quelle focale ?' },
  { id: 'c2', author: 'Mariam Diop', initials: 'MD', hue: 280, time: 'il y a 12 min', body: 'La deuxième est ma préférée. Le grain est parfait.' },
  { id: 'c3', author: 'Karim S.', initials: 'KS', hue: 20, time: 'il y a 22 min', body: 'On en reparle ce soir, j\u2019ai des idées pour la suite.' },
];

// ─────────────────────────────────────────────────────────────
// Icons (lucide-style, inline)
// ─────────────────────────────────────────────────────────────
const Icon = {
  heart: ({ filled, ...p } = {}) => (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  ),
  message: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  send: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
    </svg>
  ),
  plus: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  image: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  ),
  globe: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20M12 2a14.5 14.5 0 0 1 0 20M2 12h20" />
    </svg>
  ),
  users: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  lock: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  more: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="5" cy="12" r="1.5" fill="currentColor" /><circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  arrowLeft: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m12 19-7-7 7-7M19 12H5" />
    </svg>
  ),
  sparkle: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  ),
  sparkles: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9.94 14.5 9 17l-1-2.5L5.5 14l2.5-1L9 10.5 9.94 13l2.56 1zM18 3l-.7 2.3L15 6l2.3.7L18 9l.7-2.3L21 6l-2.3-.7zM18 13l-.7 2.3L15 16l2.3.7L18 19l.7-2.3L21 16l-2.3-.7z" />
    </svg>
  ),
  bell: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  search: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  ),
  home: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 9.5 12 2l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
    </svg>
  ),
  shop: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  brief: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  compass: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z" />
    </svg>
  ),
  user: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  msg: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
    </svg>
  ),
  wallet: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" /><path d="M22 12h-4a2 2 0 0 0 0 4h4z" />
    </svg>
  ),
  chevDown: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  refresh: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
    </svg>
  ),
  clock: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  ),
  bookmark: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  ),
  share: (p = {}) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────
// Avatar — initials over a soft hue tile, optional photo
// ─────────────────────────────────────────────────────────────
function Avatar({ initials, hue = 220, size = 40, ring, ringColor }) {
  const bg = `oklch(0.75 0.08 ${hue})`;
  const fg = `oklch(0.28 0.08 ${hue})`;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: fg,
      fontSize: size * 0.36, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: ring ? `0 0 0 2px ${ringColor || '#fff'}, 0 0 0 ${ring + 2}px ${ringColor === '#fff' ? 'rgba(0,0,0,0.05)' : '#f4b942'}` : 'inset 0 0 0 1px rgba(10,31,68,0.06)',
      letterSpacing: '0.02em',
    }}>{initials}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// Logo (compact D arc) and decorative ArcMark
// ─────────────────────────────────────────────────────────────
function DivarcLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-label="DIVARC">
      <rect width="120" height="120" rx="24" fill="#0A1F44" />
      <path d="M40 30 L40 90" stroke="#F4B942" strokeWidth="8" strokeLinecap="round" />
      <path d="M40 30 Q90 30 90 60 Q90 90 40 90" stroke="#F8F9FB" strokeWidth="8" strokeLinecap="round" fill="none" />
      <circle cx="40" cy="30" r="5" fill="#F4B942" />
      <circle cx="40" cy="90" r="5" fill="#F4B942" />
    </svg>
  );
}

function ArcDeco({ size = 200, opacity = 0.5, gold = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 320 320" style={{ opacity }}>
      <defs>
        <linearGradient id={`ag-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F4B942" />
          <stop offset="100%" stopColor="#B88A2A" />
        </linearGradient>
        <linearGradient id={`an-${size}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#142A55" />
          <stop offset="100%" stopColor="#0A1F44" />
        </linearGradient>
      </defs>
      <line x1="80" y1="50" x2="80" y2="270" stroke={`url(#ag-${size})`} strokeWidth="14" strokeLinecap="round" />
      <path d="M 80 50 Q 260 50 260 160 Q 260 270 80 270" stroke={gold ? `url(#an-${size})` : '#fff'} strokeWidth="14" strokeLinecap="round" fill="none" />
      <path d="M 80 90 Q 220 90 220 160 Q 220 230 80 230" stroke={`url(#ag-${size})`} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.55" />
      <circle cx="80" cy="50" r="9" fill="#F4B942" />
      <circle cx="80" cy="270" r="9" fill="#F4B942" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Photo placeholder (gradient block with paper grain)
// ─────────────────────────────────────────────────────────────
function PhotoBlock({ a = '#f4b942', b = '#b88a2a', c = '#0a1f44', aspect = '4/5', radius = 0 }) {
  return (
    <div style={{
      aspectRatio: aspect, width: '100%', borderRadius: radius,
      background: `radial-gradient(120% 80% at 20% 10%, ${a} 0%, ${b} 45%, ${c} 100%)`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px)',
      }} />
      <div style={{
        position: 'absolute', bottom: 12, left: 14, fontSize: 10, color: 'rgba(255,255,255,0.55)',
        fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.08em',
      }}>DIVARC · IMG</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Visibility badge
// ─────────────────────────────────────────────────────────────
function VisIcon({ v, size = 12 }) {
  if (v === 'public') return <Icon.globe width={size} height={size} />;
  if (v === 'private') return <Icon.lock width={size} height={size} />;
  return <Icon.users width={size} height={size} />;
}

Object.assign(window, {
  STORIES, POSTS, COMMENTS, Icon, Avatar, DivarcLogo, ArcDeco, PhotoBlock, VisIcon,
});
