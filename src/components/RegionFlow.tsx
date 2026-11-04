/**
 * Схема тиражирования: города программы и дуги «формат отсюда повторили там».
 * По каждой дуге бежит импульс, города в цепочке пульсируют. Чистый SVG и CSS, без скриптов.
 * На узком экране карта становится нечитаемой, поэтому там вместо неё показывается
 * список маршрутов «город → города» (переключение в motion.css, .flow-box).
 */
export type FlowRegion = { id: string; city: string; lon: number; lat: number };
export type Flow = { fromId: string; toId: string };

const W = 760;
const H = 300;
const PADX = 88;
const PADY = 40;

export function RegionFlow({ regions, flows, label, hub = 'spb' }: { regions: FlowRegion[]; flows: Flow[]; label: string; hub?: string }) {
  const lons = regions.map((r) => r.lon);
  const lats = regions.map((r) => r.lat);
  const [minLon, maxLon] = [Math.min(...lons), Math.max(...lons)];
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
  const pos = new Map(regions.map((r) => [r.id, {
    x: PADX + ((r.lon - minLon) / (maxLon - minLon || 1)) * (W - PADX * 2),
    y: PADY + ((maxLat - r.lat) / (maxLat - minLat || 1)) * (H - PADY * 2),
  }]));
  const active = new Set(flows.flatMap((f) => [f.fromId, f.toId]));
  const arcs = flows
    .map((f, i) => {
      const a = pos.get(f.fromId);
      const b = pos.get(f.toId);
      if (!a || !b) return null;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2 - Math.max(28, Math.abs(b.x - a.x) * 0.28);
      return { key: `${f.fromId}-${f.toId}-${i}`, d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`, i };
    })
    .filter((x): x is { key: string; d: string; i: number } => Boolean(x));

  const cityOf = new Map(regions.map((r) => [r.id, r.city]));
  const routes: { from: string; to: string[] }[] = [];
  for (const f of flows) {
    const from = cityOf.get(f.fromId);
    const to = cityOf.get(f.toId);
    if (!from || !to) continue;
    const r = routes.find((x) => x.from === from);
    if (!r) routes.push({ from, to: [to] });
    else if (!r.to.includes(to)) r.to.push(to);
  }
  const hubCity = cityOf.get(hub);

  return (
    <div className="flow-box">
      <svg className="flow" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} data-reveal>
        <defs>
          <radialGradient id="flow-glow">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="flow-grid" aria-hidden="true">
          {[0.25, 0.5, 0.75].map((k) => <line key={k} x1={0} x2={W} y1={H * k} y2={H * k} />)}
        </g>
        {arcs.map((a) => (
          <g key={a.key} style={{ '--i': a.i } as React.CSSProperties}>
            <path className="flow-arc" d={a.d} pathLength={1} />
            <path className="flow-pulse" d={a.d} pathLength={1} />
          </g>
        ))}
        {regions.map((r, i) => {
          const p = pos.get(r.id)!;
          const on = active.has(r.id);
          const isHub = r.id === hub;
          return (
            <g key={r.id} className={`flow-node ${on ? 'on' : ''} ${isHub ? 'hub' : ''}`} style={{ '--i': i } as React.CSSProperties}>
              {on ? <circle className="flow-halo" cx={p.x} cy={p.y} r={22} fill="url(#flow-glow)" /> : null}
              <circle className="flow-dot" cx={p.x} cy={p.y} r={isHub ? 7 : on ? 6 : 4} />
              {isHub ? <circle className="flow-ring" cx={p.x} cy={p.y} r={12} /> : null}
              <text className="flow-lbl" x={p.x} y={p.y + (i % 2 ? 22 : -14)} textAnchor="middle">{r.city}</text>
            </g>
          );
        })}
      </svg>
      <ul className="flow-list" aria-label={label}>
        {routes.length ? routes.map((r) => (
          <li key={r.from}>
            <span className="fl-from">{r.from}</span>
            <span className="fl-arrow" aria-hidden="true" />
            <span className="fl-to">{r.to.map((t) => <span key={t}>{t}</span>)}</span>
          </li>
        )) : (
          <li className="fl-hub fl-empty">Повторов форматов пока нет. Города программы: <b>{regions.map((r) => r.city).join(', ')}</b></li>
        )}
        {hubCity ? <li className="fl-hub">Кураторы программы — <b>{hubCity}</b> · городов в программе: {regions.length}</li> : null}
      </ul>
    </div>
  );
}
