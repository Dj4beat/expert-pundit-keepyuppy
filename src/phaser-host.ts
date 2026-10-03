import { asset } from './assets';
// The game ships a standalone Canvas renderer as a recovery path. When the
// vendored Phaser distribution is present, Phaser owns scaling and presentation.
export async function phaserAvailable(): Promise<boolean> {
  if ((window as any).Phaser) return true;
  try {
    const response = await fetch(asset('vendor/phaser.min.js'));
    if (!response.ok || !response.headers.get('content-type')?.includes('javascript')) return false;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = asset('vendor/phaser.min.js');
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.append(script);
    });
    return !!(window as any).Phaser;
  } catch {
    return false;
  }
}
export function mountPhaser(
  parent: HTMLElement,
  source: HTMLCanvasElement,
): { destroy: () => void; refresh: () => void } {
  const Phaser = (window as any).Phaser;
  let texture: any;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 400,
    height: 680,
    resolution: Math.min(2, devicePixelRatio || 1),
    backgroundColor: '#141416',
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: {
      create(this: any) {
        texture = this.textures.addCanvas('court', source);
        this.add.image(0, 0, 'court').setOrigin(0).setDisplaySize(400, 680);
      },
    },
  });
  source.style.display = 'none';
  source.dataset.phaser = 'true';
  return { destroy: () => game.destroy(true), refresh: () => texture?.refresh() };
}
