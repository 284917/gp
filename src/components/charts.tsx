import { tzLabel } from '@/lib/format';

/** Линейный график по неделям: до двух серий, общая шкала от нуля. */
export function LineChart({ labels, series, ariaLabel }: { labels: string[]; series: { name: string; values: number[] }[]; ariaLabel: string }) {
  const W = 640, H = 236, ml = 36, mr = 14, mt = 14, mb = 32;
  const pw = W - ml - mr, ph = H - mt - mb, n = labels.length;
  const peak = Math.max(4, ...series.flatMap((s) => s.values));
  const step = peak <= 8 ? 2 : peak <= 20 ? 5 : peak <= 50 ? 10 : peak <= 100 ? 20 : Math.ceil(peak / 5 / 50) * 50;
  const ymax = Math.ceil(peak / step) * step;
  const x = (i: number) => (n <= 1 ? ml + pw / 2 : ml + (i * pw) / (n - 1));
  const y = (v: number) => mt + ph * (1 - v / ymax);
  const ticks: number[] = [];
  for (let v = 0; v <= ymax; v += step) ticks.push(v);
  const every = n > 10 ? 2 : 1;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
      {ticks.map((v) => (
        <g key={v}>
          <line className="grid" x1={ml} x2={W - mr} y1={y(v)} y2={y(v)} />
          <text className="ax" x={ml - 8} y={y(v) + 4} textAnchor="end">{v}</text>
        </g>
      ))}
      {labels.map((l, i) => (i % every === 0 || i === n - 1 ? (
        <text key={i} className="ax" x={x(i)} y={H - 10} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>{l}</text>
      ) : null))}
      {series.map((s, si) => {
        const pts = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
        const last = s.values.length - 1;
        return (
          <g key={s.name}>
            <polyline className={`ln s${si}`} points={pts} />
            {last >= 0 ? <circle className={`pt s${si}`} cx={x(last)} cy={y(s.values[last])} r={5} /> : null}
          </g>
        );
      })}
    </svg>
  );
}

export type MapRegion = { id: string; city: string; lon: number; lat: number; tz: number; total: number; activePct: number; hasCaptain: boolean };

const LABELS: Record<string, [number, number, 'start' | 'middle' | 'end']> = {
  msk: [-14, 20, 'end'], yar: [0, -17, 'middle'], nnov: [16, 5, 'start'], ekb: [-16, 5, 'end'], chel: [0, 27, 'middle'],
  tmn: [0, -17, 'middle'], omsk: [0, 29, 'middle'], nsk: [0, 29, 'middle'], tomsk: [0, -16, 'middle'], krsk: [6, -18, 'end'],
};

/** Схема регионов: кураторы в Санкт-Петербурге, полосы часовых поясов, круги по числу амбассадоров. */
export function RegionMap({ regions, hubId = 'spb' }: { regions: MapRegion[]; hubId?: string }) {
  const px = (lon: number) => 40 + (lon - 29) * 14.5;
  const py = (lat: number) => 30 + (60.5 - lat) * 50;
  const bands: [number, number, string][] = [[27, 50, 'МСК'], [50, 56, 'МСК+1'], [56, 70, 'МСК+2'], [70, 78, 'МСК+3'], [78, 96, 'МСК+4']];
  const hub = regions.find((r) => r.id === hubId) ?? regions[0];
  if (!hub) return null;
  const hx = px(hub.lon), hy = py(hub.lat);
  const st = (r: MapRegion) => (r.activePct >= 70 ? 'good' : r.activePct >= 50 ? 'warn' : 'bad');
  const rad = (r: MapRegion) => 5 + Math.sqrt(Math.max(1, r.total)) * 2.2;
  return (
    <svg className="map" viewBox="0 0 1000 345" role="img" aria-label="Схема регионов программы с часовыми поясами">
      {bands.map(([a, b, l], i) => {
        const x1 = Math.max(0, px(a)), x2 = Math.min(1000, px(b));
        return (
          <g key={l}>
            <rect x={x1} y={0} width={x2 - x1} height={345} fill={i % 2 ? 'var(--surface-2)' : 'var(--surface)'} />
            <text className="map-band" x={(x1 + x2) / 2} y={20} textAnchor="middle">{l}</text>
          </g>
        );
      })}
      {regions.filter((r) => r.id !== hub.id).map((r) => {
        const x = px(r.lon), y = py(r.lat);
        return <path key={`l-${r.id}`} className="map-line" d={`M${hx.toFixed(1)} ${hy.toFixed(1)} Q${(hx + (x - hx) * 0.28).toFixed(1)} ${(y - 8).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`} />;
      })}
      {regions.map((r) => {
        const x = px(r.lon), y = py(r.lat), rr = rad(r);
        const isHub = r.id === hub.id;
        const [dx, dy, anchor] = LABELS[r.id] ?? [0, -rr - 6, 'middle'];
        return (
          <g key={r.id}>
            <title>{`${r.city}: ${r.total} амбассадоров, активны ${r.activePct}%, ${tzLabel(r.tz)}${r.hasCaptain ? '' : ', нет капитана'}`}</title>
            {isHub ? <circle className="hub-ring" cx={x} cy={y} r={rr + 6} /> : null}
            <circle className={`c-${st(r)}`} cx={x} cy={y} r={rr} strokeDasharray={r.hasCaptain || isHub ? undefined : '3 3'} />
            <text className="map-num" x={x} y={y + 4} textAnchor="middle">{r.total}</text>
            {isHub ? (
              <>
                <text className="map-lbl" x={x + rr + 12} y={y - 3}>{r.city}</text>
                <text className="map-sub" x={x + rr + 12} y={y + 13}>кураторы программы</text>
              </>
            ) : (
              <text className="map-lbl" x={x + dx} y={y + dy} textAnchor={anchor}>{r.city}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
