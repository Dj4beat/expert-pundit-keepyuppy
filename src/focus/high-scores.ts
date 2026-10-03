import type { FocusRecord } from './progress';

export const escapeHTML = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** Shared by the level preview and the result dialog. Names are saved user input. */
export function highScoreTable(
  records: FocusRecord[],
  levels: boolean,
  name: string,
  rank: number | null = null,
) {
  if (!records.length) return '<p>Set the first record. Your first score belongs here.</p>';
  return `<table><thead><tr><th>Rank / player</th><th>Score</th><th>${levels ? 'Stars' : 'Perfects'}</th></tr></thead><tbody>${records
    .map((record, i) => {
      const own =
        !!name && record.playerName.toLocaleLowerCase('en') === name.toLocaleLowerCase('en');
      return `<tr${own ? ' class="focus-own-score"' : ''}${rank === i + 1 ? ' aria-current="true"' : ''}><td><b>#${i + 1}</b> ${escapeHTML(record.playerName)}${rank === i + 1 ? ' <small>THIS RUN</small>' : own ? ' <small>YOU</small>' : ''}</td><td>${record.score.toLocaleString()}</td><td>${levels ? record.stars + '/5 ★' : record.perfects}</td></tr>`;
    })
    .join('')}</tbody></table>`;
}
