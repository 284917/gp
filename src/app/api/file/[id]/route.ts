import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { isPrivateBlob } from '@/lib/files';

export const dynamic = 'force-dynamic';

/**
 * Отдаёт вложение к сдаче задания из приватного хранилища.
 * Доступ: автор, капитан региона автора и кураторы. Поддерживает Range — без него Safari не проигрывает видео и аудио.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getUser();
  if (!viewer) return new NextResponse('Нужно войти', { status: 401 });
  const { id } = await params;
  const [s] = await db()<{ fileUrl: string | null; userId: number; regionId: string | null }[]>`
    select s.file_url, s.user_id, a.region_id from submissions s join users a on a.id = s.user_id
    where s.id = ${Number(id) || 0}`;
  if (!s?.fileUrl) return new NextResponse('Файл не найден', { status: 404 });

  const allowed = viewer.role === 'curator'
    || viewer.id === s.userId
    || (viewer.isCaptain && viewer.status === 'active' && viewer.regionId !== null && viewer.regionId === s.regionId);
  if (!allowed) return new NextResponse('Нет доступа', { status: 403 });
  if (!isPrivateBlob(s.fileUrl)) return NextResponse.redirect(s.fileUrl);

  const range = request.headers.get('range');
  const ifNoneMatch = range ? undefined : request.headers.get('if-none-match') ?? undefined;
  const result = await get(s.fileUrl, { access: 'private', ifNoneMatch, headers: range ? { range } : undefined }).catch((err) => {
    console.error('[file]', err);
    return null;
  });
  if (!result) return new NextResponse('Файл не найден', { status: 404 });

  const headers: Record<string, string> = {
    ETag: result.blob.etag,
    'Cache-Control': 'private, no-cache',
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
  };
  if (result.statusCode === 304) return new NextResponse(null, { status: 304, headers });

  headers['Content-Type'] = result.blob.contentType;
  const length = result.headers.get('content-length');
  const contentRange = result.headers.get('content-range');
  if (length) headers['Content-Length'] = length;
  if (contentRange) headers['Content-Range'] = contentRange;
  return new NextResponse(result.stream, { status: contentRange ? 206 : 200, headers });
}
