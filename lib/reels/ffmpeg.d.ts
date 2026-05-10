/* Ambient module declarations pour @ffmpeg/ffmpeg et @ffmpeg/util.
 * Évite l'erreur TS2307 si les packages ne sont pas encore installés
 * (ils le seront après `npm install` une fois le commit poussé).
 * Une fois installés, les vrais types remplacent ces stubs grâce à
 * `node_modules` ayant priorité sur les ambient declarations.
 *
 * V3.10 — utilisés par lib/reels/ffmpegConcat.ts. */

declare module "@ffmpeg/ffmpeg" {
  export class FFmpeg {
    load(opts: { coreURL: string; wasmURL: string }): Promise<void>;
    on(event: string, cb: (data: { progress: number }) => void): void;
    writeFile(name: string, data: Uint8Array): Promise<void>;
    readFile(name: string): Promise<Uint8Array | string>;
    deleteFile(name: string): Promise<void>;
    exec(args: string[]): Promise<number>;
    terminate(): void;
  }
}

declare module "@ffmpeg/util" {
  export function toBlobURL(url: string, mime: string): Promise<string>;
  export function fetchFile(input: Blob | File | string): Promise<Uint8Array>;
}
