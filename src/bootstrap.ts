import './style.css';
import { gameEntry } from './entry';
import { startLegacyGame } from './main';
import { startBenchmark } from './benchmark';
import { startFocusGame } from './focus';

const entry = gameEntry(location.search, window.__KEEPY_PORTABLE__, window.__KEEPY_FOCUS__);
if (entry === 'focus') {
  void startFocusGame(document.querySelector<HTMLDivElement>('#app')!);
} else if (entry === 'benchmark') {
  void startBenchmark(document.querySelector<HTMLDivElement>('#app')!);
} else {
  startLegacyGame();
}
