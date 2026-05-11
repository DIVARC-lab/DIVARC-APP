"use client";

/* lib/calls/webrtc.ts — wrapper minimal autour de RTCPeerConnection.
 *
 * Responsabilités :
 *   - Créer la PeerConnection avec les STUN servers
 *   - Acquérir le micro local (getUserMedia)
 *   - Attacher le stream local + handler du stream distant
 *   - Exposer un API simple : createOffer, applyAnswer, applyOffer, etc.
 *   - Surface les ICE candidates via callback (signaling les pousse au peer)
 *
 * V1 : audio only. Vidéo en V2. */

import { STUN_SERVERS } from "./types";

export type WebRTCHandlers = {
  /** Émis pour chaque ICE candidate locale — à envoyer via signaling. */
  onIceCandidate: (candidate: RTCIceCandidateInit) => void;
  /** Émis quand le track distant arrive (audio à brancher sur un <audio>). */
  onRemoteTrack: (stream: MediaStream) => void;
  /** Statut de connexion (connected / disconnected / failed / closed). */
  onConnectionState: (state: RTCPeerConnectionState) => void;
};

export type WebRTCClient = {
  pc: RTCPeerConnection;
  localStream: MediaStream;
  createOffer: () => Promise<RTCSessionDescriptionInit>;
  applyAnswer: (sdp: RTCSessionDescriptionInit) => Promise<void>;
  applyOffer: (sdp: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit>;
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  setMuted: (muted: boolean) => void;
  close: () => void;
};

/* Crée une PeerConnection + acquiert le micro. Throw si refus permission. */
export async function createWebRTCClient(
  handlers: WebRTCHandlers,
): Promise<WebRTCClient> {
  if (typeof RTCPeerConnection === "undefined") {
    throw new Error("WebRTC indisponible dans ce navigateur.");
  }

  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const pc = new RTCPeerConnection({
    iceServers: STUN_SERVERS,
  });

  /* Push les tracks locaux dans la PC. */
  for (const track of localStream.getTracks()) {
    pc.addTrack(track, localStream);
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      handlers.onIceCandidate(event.candidate.toJSON());
    }
  };

  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (stream) handlers.onRemoteTrack(stream);
  };

  pc.onconnectionstatechange = () => {
    handlers.onConnectionState(pc.connectionState);
  };

  return {
    pc,
    localStream,
    createOffer: async () => {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      return offer;
    },
    applyAnswer: async (sdp) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    },
    applyOffer: async (sdp) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return answer;
    },
    addIceCandidate: async (candidate) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        /* Race : on peut recevoir un ICE avant que setRemoteDescription
           soit appliqué. On log mais on n'échoue pas hard. */
        console.warn("[webrtc] addIceCandidate failed", err);
      }
    },
    setMuted: (muted) => {
      for (const track of localStream.getAudioTracks()) {
        track.enabled = !muted;
      }
    },
    close: () => {
      for (const track of localStream.getTracks()) track.stop();
      pc.close();
    },
  };
}
