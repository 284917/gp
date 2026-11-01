// Применяет SQL-миграции из папки migrations и заполняет начальные данные.
// Запускается автоматически перед сборкой (npm run build) и вручную: npm run db:migrate
import postgres from 'postgres';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedBase, seedAdmin } from './seed.mjs';

// Для миграций берём прямое подключение без пула, если оно есть (Neon и Vercel его выдают).
const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!url) {
  console.warn('[db] DATABASE_URL не задан — миграции пропущены. Подключите базу данных (см. README).');
  process.exit(0);
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {}, connect_timeout: 30 });

try {
  await sql.begin(async (tx) => {
    // Блокировка на время транзакции: две параллельные сборки не применят миграции дважды.
    await tx`select pg_advisory_xact_lock(7419031)`;
    await tx`create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())`;
    const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
    const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
    const done = new Set((await tx`select name from _migrations`).map((r) => r.name));
    for (const file of files) {
      if (done.has(file)) continue;
      await tx.unsafe(await readFile(path.join(dir, file), 'utf8'));
      await tx`insert into _migrations (name) values (${file})`;
      console.log('[db] применена миграция', file);
    }
    await seedBase(tx);
    await seedAdmin(tx);
  });
  console.log('[db] база данных готова');
} catch (err) {
  console.error('[db] ошибка миграции:', err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
