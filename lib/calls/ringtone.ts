"use client";

/* lib/calls/ringtone.ts — sonneries d'appel générées Web Audio API.
 *
 * Deux modes :
 *   - "outbound" : tonalité d'attente côté caller (style téléphone EU
 *     classique : bip 1s + silence 2s)
 *   - "inbound"  : sonnerie côté callee (bip rapide en cascade pour
 *     attirer l'attention, style smartphone)
 *
 * iOS Safari : Web Audio nécessite un user gesture pour démarrer. Le
 * click sur Phone (caller) compte. Côté callee, si l'user n'a pas
 * récemment interagi avec la page, le ring peut être muet. L'overlay
 * visuel reste de toute façon visible. */

type Ringtone = {
  stop: () => void;
};

let activeRingtone: Ringtone | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
}

/* Ringtone "outbound" : tonalité d'attente, plus discrète.
 * Pattern : 1s tone @ 440Hz + 425Hz, puis 2s silence, en boucle. */
export function startOutboundRingtone(): Ringtone {
  stopRingtone();
  const ctx = getAudioContext();
  if (!ctx) return { stop: () => {} };

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function playOneCycle() {
    if (stopped) return;
    const now = ctx!.currentTime;

    const gain = ctx!.createGain();
    gain.connect(ctx!.destination);
    /* Enveloppe douce pour éviter les clics. */
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.setValueAtTime(0.15, now + 0.95);
    gain.gain.linearRampToValueAtTime(0, now + 1.0);

    /* 2 oscillators à 440 + 425Hz pour ce son de téléphone classique. */
    const osc1 = ctx!.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = 440;
    osc1.connect(gain);
    osc1.start(now);
    osc1.stop(now + 1.0);

    const osc2 = ctx!.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 425;
    osc2.connect(gain);
    osc2.start(now);
    osc2.stop(now + 1.0);

    /* Recycle après 1s tone + 2s silence = 3s total. */
    timer = setTimeout(playOneCycle, 3000);
  }

  playOneCycle();

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      void ctx.close().catch(() => {});
    },
  };
}

/* Ringtone "inbound" : sonnerie plus présente côté callee.
 * Pattern : 4 bips rapides @ 800Hz, puis 1.5s silence, en boucle. */
export function startInboundRingtone(): Ringtone {
  stopRingtone();
  const ctx = getAudioContext();
  if (!ctx) return { stop: () => {} };

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function playOneCycle() {
    if (stopped) return;
    const now = ctx!.currentTime;

    /* 4 bips de 0.15s chacun, espacés de 0.1s = 1s total. */
    for (let i = 0; i < 4; i++) {
      const start = now + i * 0.25;
      const gain = ctx!.createGain();
      gain.connect(ctx!.destination);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.setValueAtTime(0.25, start + 0.13);
      gain.gain.linearRampToValueAtTime(0, start + 0.15);

      const osc = ctx!.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 800;
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + 0.15);

      /* Harmonique +5 demi-tons pour un son plus "smartphone". */
      const osc2 = ctx!.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 1067;
      osc2.connect(gain);
      osc2.start(start);
      osc2.stop(start + 0.15);
    }

    /* Recycle après 1s bips + 1.5s silence = 2.5s. */
    timer = setTimeout(playOneCycle, 2500);
  }

  playOneCycle();

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      void ctx.close().catch(() => {});
    },
  };
}

export function stopRingtone(): void {
  if (activeRingtone) {
    activeRingtone.stop();
    activeRingtone = null;
  }
}

/* Helpers internes qui gardent une ref globale pour stopRingtone(). */
export function startOutbound(): void {
  activeRingtone = startOutboundRingtone();
}
export function startInbound(): void {
  activeRingtone = startInboundRingtone();
}
