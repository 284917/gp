import { NextResponse } from 'next/server';
import { db, dbUrl } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!dbUrl()) return NextResponse.json({ ok: false, database: 'not configured' }, { status: 503 });
  try {
    const [row] = await db()<{ users: number; tasks: number }[]>`
      select (select count(*)::int from users) as users, (select count(*)::int from tasks) as tasks`;
    return NextResponse.json({
      ok: true,
      database: 'connected',
      users: row.users,
      tasks: row.tasks,
      uploads: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      demo: process.env.DEMO_MODE !== 'false',
    });
  } catch (err) {
    return NextResponse.json({ ok: false, database: 'error', message: err instanceof Error ? err.message : String(err) }, { status: 503 });
  }
}
