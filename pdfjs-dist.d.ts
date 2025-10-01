// types/pdfjs-dist.d.ts
declare module "pdfjs-dist" {
  export const GlobalWorkerOptions: {
    workerSrc?: string;
    workerPort?: Worker | null;
  };
  export function getDocument(
    src: string | { url: string }
  ): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<{
        getViewport(opts: { scale: number }): { width: number; height: number };
        render(opts: {
          canvasContext: CanvasRenderingContext2D;
          viewport: { width: number; height: number };
        }): { promise: Promise<void> };
      }>;
    }>;
  };
}
