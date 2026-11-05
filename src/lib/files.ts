/**
 * Файлы заданий в Vercel Blob.
 * Хранилище приватное: файл видят только автор, капитан его региона и кураторы,
 * а отдаёт его маршрут /api/file/[id] после проверки доступа.
 * На Vercel подключённое хранилище авторизуется через OIDC (переменная BLOB_STORE_ID),
 * вне Vercel — через BLOB_READ_WRITE_TOKEN.
 */

/** Запрос к функции Vercel ограничен 4,5 МБ, оставляем запас на заголовки формы. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const blobEnabled = () => Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);

/** Режим хранилища задаётся при его создании. По умолчанию приватный; для публичного задайте BLOB_ACCESS=public. */
export const blobAccess = (): 'public' | 'private' => (process.env.BLOB_ACCESS === 'public' ? 'public' : 'private');

export const BLOB_URL = /^https:\/\/[a-z0-9-]+\.(public|private)\.blob\.vercel-storage\.com\//i;
export const isPrivateBlob = (url: string) => /^https:\/\/[a-z0-9-]+\.private\.blob\.vercel-storage\.com\//i.test(url);

/** Адрес, по которому браузер покажет вложение к сдаче задания. */
export const fileSrc = (submissionId: number, url: string) => (isPrivateBlob(url) ? `/api/file/${submissionId}` : url);
