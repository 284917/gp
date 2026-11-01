'use client';

import { useActionState, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { submitTask } from '@/app/actions/me';
import type { FormState } from '@/app/actions/auth';
import { SUBMIT_LABEL, type SubmitType } from '@/lib/domain';
import { Icon } from './Icon';
import { SubmitButton } from './SubmitButton';

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
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadError('');
    if (f.size > 200 * 1024 * 1024) { setUploadError('Файл больше 200 МБ. Сожмите видео или пришлите ссылку.'); return; }
    setUploading(1);
    try {
      const blob = await upload(`submissions/${taskId}/${f.name}`, f, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        onUploadProgress: (p) => setUploading(Math.max(1, Math.round(p.percentage))),
      });
      setFile({ url: blob.url, name: f.name });
    } catch {
      setUploadError('Не удалось загрузить файл. Проверьте интернет и попробуйте ещё раз.');
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
            <span>{uploading ? `Загружаю… ${uploading}%` : file ? file.name : 'Прикрепите фото, видео или голосовое'}</span>
            <input type="file" accept="image/*,video/*,audio/*" onChange={onFile} disabled={uploading > 0} />
          </label>
          {uploadError ? <p className="fine" style={{ color: 'var(--bad)' }}>{uploadError}</p> : null}
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
