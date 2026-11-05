import { approveSubmission } from '@/app/actions/review';
import { KINDS, SEGMENTS, type Kind, type Segment } from '@/lib/domain';
import { timeAgo } from '@/lib/format';
import { Avatar, KindIcon, MediaPreview } from './ui';
import { Icon } from './Icon';
import { SubmitButton } from './SubmitButton';
import { ReturnForm } from './ReturnForm';

export type ReviewItem = {
  id: number;
  userName: string;
  segment: Segment;
  city: string | null;
  title: string;
  kind: Kind;
  points: number;
  body: string | null;
  link: string | null;
  fileUrl: string | null;
  fileName: string | null;
  flagged: boolean;
  createdAt: Date;
  captainName?: string | null;
};

export function ReviewCard({ s, showRoute = false }: { s: ReviewItem; showRoute?: boolean }) {
  return (
    <article className="mod">
      <div className="mod-top">
        <Avatar name={s.userName} className="soft sm" />
        <div className="mod-who">
          <b>{s.userName}</b>
          <span>{SEGMENTS[s.segment]?.label} · {s.city} · {timeAgo(s.createdAt)}</span>
        </div>
        <KindIcon kind={s.kind} size="sm" />
      </div>
      <p className="mod-title">{s.title} <span className="pts">+{s.points}</span></p>
      {s.body ? <p className="text-pre" style={{ fontSize: 14, color: 'var(--muted)' }}>{s.body}</p> : null}
      {s.link ? <a className="link row" href={s.link} target="_blank" rel="noreferrer" style={{ fontSize: 14 }}><Icon name="external" size={15} /> {s.link.replace(/^https?:\/\//, '').slice(0, 60)}</a> : null}
      {s.fileUrl ? <MediaPreview id={s.id} url={s.fileUrl} name={s.fileName} /> : null}
      {s.flagged ? <p className="flag"><Icon name="shield" size={16} /> {KINDS[s.kind].label === 'Ссылка' || KINDS[s.kind].label === 'Текст' ? 'Внешняя публикация: проверьте формулировки и цифры' : 'Съёмка на объекте: проверьте зону и людей в кадре'}</p> : null}
      {showRoute ? (
        <p className="fine">{s.flagged ? 'Отмечено для куратора' : s.captainName ? `Может проверить капитан: ${s.captainName}` : 'В регионе нет капитана'}</p>
      ) : null}
      <div className="btns">
        <form action={approveSubmission}>
          <input type="hidden" name="id" value={s.id} />
          <SubmitButton className="btn primary small" pendingText="Принимаю…"><Icon name="check" size={16} /> Принять</SubmitButton>
        </form>
        <ReturnForm id={s.id} />
      </div>
    </article>
  );
}
