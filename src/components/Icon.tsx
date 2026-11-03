const PATHS = {
  flag: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>',
  tasks: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="m8 9 1.5 1.5L12 8M8 15l1.5 1.5L12 14M14.5 9.5H17M14.5 15.5H17"/>',
  kit: '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
  bars: '<path d="M5 20v-8M12 20V5M19 20v-5"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4.5" rx="1"/><path d="M5.5 12.5V20h13v-7.5M12 8v12"/><path d="M12 8C10.5 5 7 4.5 7 6.5S10 8 12 8c2 0 5 .5 5-1.5S13.5 5 12 8Z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  camera: '<path d="M4 8.5h3.2L9 6h6l1.8 2.5H20V19H4Z"/><circle cx="12" cy="13.2" r="3.4"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10.5 5-3v9l-5-3"/>',
  pen: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.1c2.6.3 4.5 2.5 4.5 5.4"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V5.5a1.5 1.5 0 0 0-1.5-1.5H5.5A1.5 1.5 0 0 0 4 5.5V14a1.5 1.5 0 0 0 1.5 1.5h3"/>',
  shield: '<path d="M12 3 5 6v5.5c0 4.3 2.9 8 7 9.5 4.1-1.5 7-5.2 7-9.5V6Z"/><path d="M12 8.5v4M12 15.5v.1"/>',
  lock: '<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
  tandem: '<circle cx="8.5" cy="12" r="4.8"/><circle cx="15.5" cy="12" r="4.8"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 15v4.5h16V15"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  no: '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 9.5V20h12V9.5"/>',
  inbox: '<path d="M4 13h4.5l1.5 2.5h4l1.5-2.5H20"/><path d="M6 5h12l2 8v6H4v-6Z"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.8-3.6 3.8-6 7.5-6s6.7 2.4 7.5 6"/>',
  map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6Z"/><path d="M9 4v14M15 6v14"/>',
  chart: '<path d="M4 4v16h16"/><path d="m7.5 14 3.5-4 3 3 5-6"/>',
  star: '<path d="m12 3.8 2.5 5 5.5.8-4 3.9.9 5.5L12 16.4 7.1 19l.9-5.5-4-3.9 5.5-.8Z"/>',
  logout: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 16l-4-4 4-4M6 12h9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.1"/>',
  file: '<path d="M6 3h8l4 4v14H6Z"/><path d="M14 3v4h4"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5H10"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16Z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M8 6H5v1.5A3.5 3.5 0 0 0 8.5 11M16 6h3v1.5A3.5 3.5 0 0 1 15.5 11M12 13v4M8.5 20h7M10 17h4v3h-4Z"/>',
  bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6Z"/>',
  idea: '<path d="M9 17.5h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .8 1.6v.6h5.6v-.6c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3Z"/>',
  repeat: '<path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H19M16 3l3 3-3 3"/><path d="M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5M8 21l-3-3 3-3"/>',
  rocket: '<path d="M14 4c3-1 5.5-.5 6 0 .5.5 1 3 0 6l-6.5 6.5-6-6Z"/><path d="M7.5 10.5 4 10l3-4h4.5M13.5 16.5 14 20l4-3v-4.5"/><path d="M6 15c-1.5.5-2.5 2.5-2.5 5.5 3 0 5-1 5.5-2.5"/><circle cx="15.5" cy="8.5" r="1.5"/>',
  library: '<rect x="3.5" y="4" width="4.5" height="16" rx="1"/><rect x="9.5" y="4" width="4.5" height="16" rx="1"/><path d="m15.4 5.6 3.4-.9 3.1 14.6-3.4.9Z"/>',
  sparkle: '<path d="M12 3c.6 4.5 2.5 6.4 7 7-4.5.6-6.4 2.5-7 7-.6-4.5-2.5-6.4-7-7 4.5-.6 6.4-2.5 7-7Z"/><path d="M19 16c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5Z"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.4"/>',
} satisfies Record<string, string>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className ? `ic ${className}` : 'ic'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}

export function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className="ic">
      <rect width="28" height="28" rx="8" fill="var(--brand)" />
      <rect x="6" y="11" width="2.6" height="6" rx="1.3" fill="var(--on-brand)" />
      <rect x="10.5" y="7.5" width="2.6" height="13" rx="1.3" fill="var(--on-brand)" />
      <rect x="15" y="5" width="2.6" height="18" rx="1.3" fill="var(--on-brand)" />
      <rect x="19.5" y="9.5" width="2.6" height="9" rx="1.3" fill="var(--accent)" />
    </svg>
  );
}

export function Wave({ width = 150, height = 70, className = 'wave' }: { width?: number; height?: number; className?: string }) {
  const h = [10, 18, 28, 40, 30, 52, 36, 22, 44, 60, 38, 26, 16, 30, 12];
  return (
    <svg className={className} width={width} height={height} viewBox="0 0 150 70" aria-hidden="true">
      {h.map((v, i) => (
        <rect key={i} x={i * 10} y={(70 - v) / 2} width="5" height={v} rx="2.5" fill="currentColor" />
      ))}
    </svg>
  );
}
