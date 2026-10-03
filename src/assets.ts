declare global {
  interface Window {
    __KEEPY_ASSETS__?: Record<string, string>;
    __KEEPY_PORTABLE__?: boolean;
    __KEEPY_FOCUS__?: boolean;
  }
}
export const asset = (path: string) =>
  window.__KEEPY_ASSETS__?.[path] ?? `${import.meta.env.BASE_URL}${path}`;
const decoded = new Map<string, HTMLImageElement>();
export async function loadImage(path: string): Promise<HTMLImageElement> {
  const url = asset(path);
  const existing = decoded.get(url);
  if (existing) return existing;
  const img = new Image();
  img.src = url;
  await img.decode();
  decoded.set(url, img);
  return img;
}
export async function preloadRun(
  character: string,
  venue: string,
  onProgress: (n: number) => void,
) {
  let done = 0;
  const images = await Promise.all(
    [`art/${character}.webp`, `art/${venue}.webp`].map(async (path) => {
      const img = await loadImage(path);
      onProgress(++done / 2);
      return img;
    }),
  );
  return { character: images[0], venue: images[1] };
}
