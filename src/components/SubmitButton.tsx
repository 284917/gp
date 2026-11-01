'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({
  children,
  pendingText = 'Сохраняю…',
  className = 'btn primary',
  disabled,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending} name={name} value={value}>
      {pending ? pendingText : children}
    </button>
  );
}
