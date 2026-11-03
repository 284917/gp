/** Template пересоздаётся при каждом переходе, поэтому страница каждый раз мягко въезжает. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
