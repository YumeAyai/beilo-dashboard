declare module 'qrcode' {
  export function toCanvas(canvas: HTMLCanvasElement, text: string, options?: object): Promise<void>;
}