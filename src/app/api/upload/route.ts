import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getUser } from '@/lib/auth';
import { MAX_UPLOAD_BYTES, blobAccess, blobEnabled } from '@/lib/files';

export const dynamic = 'force-dynamic';

const MEDIA_EXT = /\.(jpe?g|png|webp|gif|heic|heif|avif|mp4|mov|m4v|webm|3gp|mp3|m4a|aac|ogg|oga|opus|wav|amr)$/i;

/** Загрузка вложения к заданию: файл проходит через функцию и сохраняется в хранилище под папкой участника. */
export async function POST(request: Request) {
  if (!blobEnabled()) return NextResponse.json({ error: 'Хранилище файлов не подключено' }, { status: 501 });
  const user = await getUser();
  if (!user || user.role !== 'ambassador' || user.status !== 'active') {
    return NextResponse.json({ error: 'Нужно войти в кабинет' }, { status: 401 });
  }

  let fd: FormData;
  try {
    fd = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Файл больше 4 МБ. Сожмите его или пришлите ссылку на облако.' }, { status: 413 });
  }
  const file = fd.get('file');
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: 'Файл не получен' }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Файл больше 4 МБ. Сожмите его или пришлите ссылку на облако.' }, { status: 413 });
  }
  const media = /^(image|video|audio)\//.test(file.type) || (!file.type && MEDIA_EXT.test(file.name));
  if (!media) return NextResponse.json({ error: 'Подойдут фото, видео или аудио' }, { status: 415 });

  const taskId = Number(fd.get('taskId')) || 0;
  const safeName = file.name.normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/^_+/, '').slice(-80) || 'file';
  try {
    const blob = await put(`submissions/${user.id}/${taskId}/${safeName}`, file, {
      access: blobAccess(),
      addRandomSuffix: true,
      contentType: file.type || undefined,
    });
    return NextResponse.json({ url: blob.url, name: file.name });
  } catch (err) {
    console.error('[upload]', err);
    return NextResponse.json({ error: 'Хранилище не приняло файл. Попробуйте ещё раз или пришлите ссылку.' }, { status: 502 });
  }
}
