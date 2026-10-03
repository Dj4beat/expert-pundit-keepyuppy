export class OfflineManager {
  inRun = false;
  updateAvailable = false;
  private registration: ServiceWorkerRegistration | null = null;
  constructor(
    private report: (text: string) => void,
    private autoDownload = true,
  ) {}
  async init() {
    if (window.__KEEPY_PORTABLE__) {
      this.report('Ready offline · portable edition');
      return;
    }
    if (!('serviceWorker' in navigator)) {
      this.report('Offline download unavailable in this browser');
      return;
    }
    if (import.meta.env.DEV) {
      this.report('Offline caching available in production build');
      return;
    }
    try {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const d = event.data;
        if (d?.type === 'PROGRESS')
          this.report(`Downloading offline game · ${d.done} / ${d.total}`);
        if (d?.type === 'READY') this.report('Ready offline');
        if (d?.type === 'ERROR') this.report('Download paused · tap to retry');
      });
      this.registration = await navigator.serviceWorker.register(
        `${import.meta.env.BASE_URL}sw.js`,
        { scope: import.meta.env.BASE_URL },
      );
      if (this.registration.waiting) this.updateAvailable = true;
      this.registration.addEventListener('updatefound', () => {
        const worker = this.registration?.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller)
            this.updateAvailable = true;
        });
      });
      await navigator.serviceWorker.ready;
      if (!this.inRun && this.autoDownload) await this.download();
    } catch {
      this.report('Offline download unavailable · tap to retry');
    }
  }
  async download() {
    if (window.__KEEPY_PORTABLE__) {
      this.report('Ready offline · portable edition');
      return;
    }
    if (this.inRun) {
      this.report('Download available after this run');
      return;
    }
    const worker = this.registration?.active;
    if (!worker) {
      this.report(
        import.meta.env.DEV
          ? 'Build and preview to test offline play'
          : 'Connect once to prepare offline play',
      );
      return;
    }
    this.report('Checking offline content…');
    worker.postMessage({ type: 'DOWNLOAD' });
  }
  activateUpdate() {
    if (this.inRun || !this.registration?.waiting) return;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!reloaded) {
        reloaded = true;
        location.reload();
      }
    });
    this.registration.waiting.postMessage({ type: 'ACTIVATE' });
  }
}
