import postgres from 'postgres';

type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __golosSql?: Sql };

export function dbUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

/** Общее подключение к Postgres. Названия колонок приходят в camelCase. */
export function db(): Sql {
  if (!g.__golosSql) {
    const url = dbUrl();
    if (!url) {
      throw new Error('База данных не подключена: задайте переменную окружения DATABASE_URL (см. README).');
    }
    g.__golosSql = postgres(url, {
      max: 5,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 15,
      transform: postgres.camel,
      onnotice: () => {},
    });
  }
  return g.__golosSql;
}
