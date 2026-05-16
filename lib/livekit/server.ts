import "server-only";

/* Sprint E (LiveKit) — Génération d'access tokens côté serveur.
 *
 * Le token JWT est signé avec LIVEKIT_API_SECRET et donne au porteur le
 * droit de rejoindre une room LiveKit avec une identité fixe. Il est
 * généré une seule fois (à la demande du client) et ne doit jamais
 * être partagé.
 *
 * Le `room` LiveKit est nommé d'après l'UUID circle_live_rooms.id.
 * LiveKit crée la room à la volée au premier join, on n'a rien à
 * pré-déclarer côté SFU. */

import { AccessToken } from "livekit-server-sdk";

export type GrantTokenArgs = {
  roomId: string;
  userId: string;
  /* Display name affiché aux autres participants. */
  displayName: string;
  /* Si true, peut publier audio+video. Si false, juste écoute (audience). */
  canPublish?: boolean;
};

export function isLiveKitConfigured(): boolean {
  return Boolean(
    process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET &&
      process.env.NEXT_PUBLIC_LIVEKIT_URL,
  );
}

export async function generateLiveKitToken(
  args: GrantTokenArgs,
): Promise<string | null> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) return null;

  const at = new AccessToken(apiKey, apiSecret, {
    identity: args.userId,
    name: args.displayName,
    /* Token valide 1h — assez pour démarrer + rester ; le client peut
       reconnect dans la fenêtre. */
    ttl: 60 * 60,
  });

  at.addGrant({
    roomJoin: true,
    room: args.roomId,
    canPublish: args.canPublish ?? true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await at.toJwt();
}
