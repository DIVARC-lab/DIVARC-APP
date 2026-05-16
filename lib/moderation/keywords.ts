/* Étape 19 — Blacklist keywords FR pour pré-filtre chat live.
 *
 * Liste minimale d'insultes/spam patterns courants. Match insensible à
 * la casse, accents normalisés. Les variantes obfusquées (a→@, etc.)
 * ne sont pas capturées ici — c'est Claude qui les gère.
 *
 * Cette liste est volontairement courte pour rester rapide (<5ms) et
 * couvre les cas où Claude est désactivé (auto_mod_level='low').
 */

const RAW_BLOCKED = [
  /* Insultes FR courantes — version sanitized (slurs reduced to base form
     pour rester catchable). */
  "connard",
  "connasse",
  "salope",
  "pute",
  "putain de toi",
  "fdp",
  "ntm",
  "nique ta mere",
  "nique ta mère",
  "encule",
  "enculé",
  "enculer",
  "pédé",
  "tarlouze",
  "négro",
  "bicot",
  /* Spam / pub */
  "telegram @",
  "whatsapp @",
  "gain garanti",
  "free money",
  "click here",
  "cliquez ici",
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    /* Supprime les accents combinants. */
    .replace(/[̀-ͯ]/g, "");
}

const BLOCKED_NORMALIZED = RAW_BLOCKED.map(normalize);

export type KeywordMatch = {
  matched: string;
  position: number;
};

export function findBlockedKeyword(text: string): KeywordMatch | null {
  if (!text) return null;
  const norm = normalize(text);
  for (const kw of BLOCKED_NORMALIZED) {
    const idx = norm.indexOf(kw);
    if (idx >= 0) {
      return { matched: kw, position: idx };
    }
  }
  return null;
}
