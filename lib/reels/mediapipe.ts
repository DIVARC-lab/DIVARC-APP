/* MediaPipe loader skeleton — V3.12 placeholder.
 *
 * V3.12 ship : juste l'infrastructure de chargement lazy. Les effets AR
 * réels (face_mesh, glasses overlay, masque) arrivent en V4.
 *
 * Architecture cible V4 :
 *   1. loadFaceLandmarker() : charge @mediapipe/tasks-vision + le modèle
 *      face_landmarker.task via CDN
 *   2. detectLandmarks(video) : retourne 478 points 3D du visage
 *   3. renderAREffect(canvas, landmarks, effectId) : draw overlay
 *
 * En V3.12 cette lib n'est pas utilisée — les effets sont 100% CSS. On la
 * livre vide pour que le wiring (effect_used array, render hook) soit
 * en place et accueille V4 sans refacto. */

export type FaceLandmark = {
  x: number;
  y: number;
  z: number;
};

export type FaceResult = {
  landmarks: FaceLandmark[][];
  ok: boolean;
};

let faceLandmarkerInstance: unknown = null;

export async function loadFaceLandmarker(): Promise<unknown> {
  if (faceLandmarkerInstance) return faceLandmarkerInstance;
  /* V4 implementation :
   *
   * const { FaceLandmarker, FilesetResolver } =
   *   await import("@mediapipe/tasks-vision");
   * const fileset = await FilesetResolver.forVisionTasks(
   *   "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
   * );
   * faceLandmarkerInstance = await FaceLandmarker.createFromOptions(fileset, {
   *   baseOptions: {
   *     modelAssetPath:
   *       "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
   *   },
   *   runningMode: "VIDEO",
   *   numFaces: 1,
   * });
   */
  throw new Error("MediaPipe AR effects coming in V4 (mediapipe.ts:loadFaceLandmarker)");
}

export async function detectFace(
  _video: HTMLVideoElement,
  _timestampMs: number,
): Promise<FaceResult> {
  /* V4 : faceLandmarker.detectForVideo(video, ts) → landmarks */
  return { landmarks: [], ok: false };
}
