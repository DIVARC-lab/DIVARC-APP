/* Audio fingerprinting V3.13 — stub client-side + plan AcoustID V4.
 *
 * V3.13 ship :
 *   - hashBlobSHA256(blob) : SHA-256 du fichier vidéo via Web Crypto API
 *   - Pas un vrai fingerprint audio (Chromaprint nécessite ffmpeg server),
 *     mais permet :
 *     · détection de duplicats parfaits (upload du même fichier)
 *     · marqueur en DB pour le pipeline async V4
 *
 * V4 path :
 *   - Worker server-side : ffmpeg extract audio + chromaprint génère
 *     fingerprint → POST AcoustID API → si match copyrighted, set
 *     fingerprint_status='copyrighted' + copyright_match_id
 *   - Cron 5min ramasse fingerprint_status='pending' et lance le worker
 *
 * Limitations V3.13 :
 *   - SHA-256 ne match pas des remix/clips du même son
 *   - Faux négatifs : ré-encodage change le hash. Pas grave V3.13, c'est
 *     un signal optimiste seulement. */

export async function hashBlobSHA256(blob: Blob): Promise<string> {
  /* Pour les gros blobs (>50MB), on hash par chunks pour pas saturer la
   * RAM. Web Crypto digest accepte un ArrayBuffer complet ; pour V3.13
   * (vidéos < 100MB) on accepte de tout charger. */
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return bufferToHex(digest);
}

export async function hashUrlSHA256(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const blob = await res.blob();
  return hashBlobSHA256(blob);
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}
