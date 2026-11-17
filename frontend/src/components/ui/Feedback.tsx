import { CircleAlert, CircleCheck, Inbox, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './Feedback.module.css';

export function Spinner({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className={styles.spinner} role="status">
      <LoaderCircle size={20} className="spin" />
      <span>{label}</span>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className={styles.fullPage}>
      <Spinner />
    </div>
  );
}

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="alert alert-error" role="alert">
      <CircleAlert size={18} />
      <span>{message}</span>
    </div>
  );
}

export function SuccessAlert({ children }: { children: ReactNode }) {
  return (
    <div className="alert alert-success" role="status">
      <CircleCheck size={18} />
      <span>{children}</span>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>
        <Inbox size={22} />
      </div>
      <strong>{title}</strong>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  );
}
