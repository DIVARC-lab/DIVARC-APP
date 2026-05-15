"use client";

/* lib/calls/webrtc.ts — wrapper minimal autour de RTCPeerConnection.
 *
 * Responsabilités :
 *   - Créer la PeerConnection avec les STUN servers
 *   - Acquérir le micro (et la caméra si kind=video) local via getUserMedia
 *   - Attacher le stream local + handler du stream distant
 *   - Exposer un API simple : createOffer, applyAnswer, applyOffer, etc.
 *   - Surface les ICE candidates via callback (signaling les pousse au peer)
 *   - Permettre mute audio + mute video + switch caméra (front/back) en
 *     cours d'appel pour la vidéo. */

import type { CallKind } from "./types";
import { STUN_SERVERS } from "./types";

export type WebRTCHandlers = {
  /** Émis pour chaque ICE candidate locale — à envoyer via signaling. */
  onIceCandidate: (candidate: RTCIceCandidateInit) => void;
  /** Émis quand le track distant arrive (audio → <audio>, vidéo → <video>). */
  onRemoteTrack: (stream: MediaStream) => void;
  /** Statut de connexion (connected / disconnected / failed / closed). */
  onConnectionState: (state: RTCPeerConnectionState) => void;
};

export type WebRTCClient = {
  pc: RTCPeerConnection;
  localStream: MediaStream;
  kind: CallKind;
  createOffer: () => Promise<RTCSessionDescriptionInit>;
  applyAnswer: (sdp: RTCSessionDescriptionInit) => Promise<void>;
  applyOffer: (sdp: RTCSessionDescriptionInit) => Promise<RTCSessionDescriptionInit>;
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  setMuted: (muted: boolean) => void;
  /** Pour appels vidéo : active/désactive la caméra (mute video tracks). */
  setVideoMuted: (muted: boolean) => void;
  /** Pour appels vidéo mobile : bascule front/back camera. Renvoie le
   *  nouveau facingMode appliqué ("user" ou "environment"). */
  switchCamera: () => Promise<"user" | "environment" | null>;
  close: () => void;
};

/* Crée une PeerConnection + acquiert micro/caméra. Throw si refus
 * permission. Pour kind="video", demande aussi `video` à getUserMedia.
 * Le caller doit s'assurer que l'appel se fait suite à un user gesture
 * (clic sur bouton appel) — sinon iOS Safari refuse la permission. */
export async function createWebRTCClient(
  handlers: WebRTCHandlers,
  kind: CallKind = "audio",
): Promise<WebRTCClient> {
  if (typeof RTCPeerConnection === "undefined") {
    throw new Error("WebRTC indisponible dans ce navigateur.");
  }

  const constraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video:
      kind === "video"
        ? {
            facingMode: "user",
            /* 720p max — bon ratio qualité/bandwidth. iOS PWA peut
               downgrader automatiquement si le device est limité. */
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 },
          }
        : false,
  };

  const localStream = await navigator.mediaDevices.getUserMedia(constraints);

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

  /* Helper interne : remplace le track vidéo courant par un nouveau
   * obtenu via getUserMedia (utilisé pour switchCamera). */
  async function replaceVideoTrack(facingMode: "user" | "environment") {
    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { exact: facingMode },
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 30 },
      },
    });
    const newTrack = newStream.getVideoTracks()[0];
    if (!newTrack) {
      newStream.getTracks().forEach((t) => t.stop());
      return null;
    }
    /* Trouve le sender vidéo dans la PC et remplace son track. Le peer
     * n'a PAS besoin d'une renégociation SDP — replaceTrack est seamless. */
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender) {
      await sender.replaceTrack(newTrack);
    }
    /* Stop l'ancien video track du localStream et add le nouveau pour
     * que la preview locale se mette à jour. */
    for (const oldTrack of localStream.getVideoTracks()) {
      localStream.removeTrack(oldTrack);
      oldTrack.stop();
    }
    localStream.addTrack(newTrack);
    return facingMode;
  }

  return {
    pc,
    localStream,
    kind,
    createOffer: async () => {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: kind === "video",
      });
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
    setVideoMuted: (muted) => {
      for (const track of localStream.getVideoTracks()) {
        track.enabled = !muted;
      }
    },
    switchCamera: async () => {
      /* Détecte le facingMode courant via track settings (best-effort). */
      const currentTrack = localStream.getVideoTracks()[0];
      if (!currentTrack) return null;
      const settings = currentTrack.getSettings();
      const currentFacing =
        settings.facingMode === "environment" ? "environment" : "user";
      const target = currentFacing === "user" ? "environment" : "user";
      try {
        return await replaceVideoTrack(target);
      } catch (err) {
        /* Caméra arrière indispo (desktop, iPad SE, etc.) → on garde
           la caméra courante. */
        console.warn("[webrtc] switchCamera failed", err);
        return null;
      }
    },
    close: () => {
      for (const track of localStream.getTracks()) track.stop();
      pc.close();
    },
  };
}
