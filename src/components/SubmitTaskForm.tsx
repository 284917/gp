'use client';

import { useActionState, useState } from 'react';
import { submitTask } from '@/app/actions/me';
import type { FormState } from '@/app/actions/auth';
import { SUBMIT_LABEL, type SubmitType } from '@/lib/domain';
import { Icon } from './Icon';
import { SubmitButton } from './SubmitButton';

const MAX_MB = 4;

/** Фото с телефона весят 3–8 МБ: уменьшаем до 1920 px по длинной стороне, этого хватает для публикации. */
async function shrinkImage(f: File): Promise<File> {
  if (!f.type.startsWith('image/') || f.type === 'image/gif' || f.size < 900 * 1024) return f;
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!out || out.size >= f.size) return f;
    return new File([out], `${f.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`, { type: 'image/jpeg' });
  } catch {
    return f;
  }
}

/** Отправка через XHR, чтобы показывать процент загрузки. */
function sendFile(f: File, taskId: number, onProgress: (pct: number) => void): Promise<{ url: string; name: string }> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('taskId', String(taskId));
    fd.append('file', f, f.name);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.max(1, Math.round((e.loaded / e.total) * 100))); };
    xhr.onload = () => {
      let data: { url?: string; name?: string; error?: string } = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* ответ не JSON */ }
      if (xhr.status === 200 && data.url) resolve({ url: data.url, name: data.name || f.name });
      else reject(new Error(data.error || (xhr.status === 413 ? `Файл больше ${MAX_MB} МБ. Сожмите его или пришлите ссылку на облако.` : '')));
    };
    xhr.onerror = () => reject(new Error(''));
    xhr.send(fd);
  });
}

export function SubmitTaskForm({ taskId, types, blobEnabled }: { taskId: number; types: SubmitType[]; blobEnabled: boolean }) {
  const available = types.filter((t) => t !== 'file' || blobEnabled);
  const modes: SubmitType[] = available.length ? available : ['text'];
  const [mode, setMode] = useState<SubmitType>(modes[0]);
  const [state, action] = useActionState<FormState, FormData>(submitTask, {});
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [file, setFile] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState('');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    setUploadError('');
    setUploading(1);
    try {
      const f = await shrinkImage(picked);
      if (f.size > MAX_MB * 1024 * 1024) {
        setUploadError(`Файл больше ${MAX_MB} МБ. Для длинного видео пришлите ссылку на облако или VK Видео.`);
        return;
      }
      setFile(await sendFile(f, taskId, setUploading));
    } catch (err) {
      setUploadError((err instanceof Error && err.message) || 'Не удалось загрузить файл. Проверьте интернет и попробуйте ещё раз.');
    } finally {
      setUploading(0);
    }
  }

  const ready = Boolean(body.trim().length >= 10 || /^https?:\/\/\S+\.\S+/.test(link.trim()) || file);

  return (
    <form action={action} className="submit-box">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="fileUrl" value={file?.url ?? ''} />
      <input type="hidden" name="fileName" value={file?.name ?? ''} />
      <p className="label">Сдать задание</p>
      {modes.length > 1 ? (
        <div className="tabs" role="group" aria-label="Что прикрепить">
          {modes.map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {SUBMIT_LABEL[m]}
              {(m === 'text' && body.trim()) || (m === 'link' && link.trim()) || (m === 'file' && file) ? <Icon name="check" size={14} /> : null}
            </button>
          ))}
        </div>
      ) : null}

      <div hidden={mode !== 'text'} className="field-wrap">
        <label className="sr-only" htmlFor="body">Текст</label>
        <textarea id="body" name="body" className="field" rows={5} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Текст поста или короткий отчёт: что сделали, сколько было людей, что получилось" maxLength={5000} />
      </div>
      <div hidden={mode !== 'link'} className="field-wrap">
        <label className="sr-only" htmlFor="link">Ссылка на публикацию</label>
        <input id="link" name="link" type="url" inputMode="url" className="field" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
      </div>
      {modes.includes('file') ? (
        <div hidden={mode !== 'file'} className="field-wrap">
          <label className={`drop ${file ? 'has' : ''}`}>
            <Icon name={file ? 'check' : 'upload'} />
            <span>{uploading ? `Загружаю… ${uploading}%` : file ? file.name : 'Прикрепите фото, голосовое или короткое видео'}</span>
            <input type="file" accept="image/*,video/*,audio/*" onChange={onFile} disabled={uploading > 0} />
          </label>
          {uploadError ? <p className="fine" style={{ color: 'var(--bad)' }}>{uploadError}</p> : <p className="fine">Фото сожмём сами. Голосовое и видео — до {MAX_MB} МБ, длинное видео пришлите ссылкой.</p>}
        </div>
      ) : null}
      {types.includes('file') && !blobEnabled ? (
        <p className="fine">Загрузка файлов пока не подключена. Пришлите ссылку на облако или опишите результат текстом.</p>
      ) : null}

      {state.error ? <div className="alert bad" role="alert"><span>{state.error}</span></div> : null}
      <SubmitButton className="btn primary large wide" pendingText="Отправляю…" disabled={!ready || uploading > 0}>Отправить на проверку</SubmitButton>
    </form>
  );
}
