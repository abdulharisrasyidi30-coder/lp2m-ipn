import type { ReactNode } from 'react';
import { STATUS_LABEL, bukaBerkas } from './lib';

export function Chip({ status }: { status: string }) {
  return <span className={`chip chip-${status}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function PageHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function State({ loading, error, empty, emptyText }: { loading: boolean; error: string | null; empty?: boolean; emptyText?: string }) {
  if (loading) return <p className="muted">Memuat data…</p>;
  if (error) return <p className="alert alert-err" role="alert">Terjadi kesalahan: {error}</p>;
  if (empty) return <p className="empty">{emptyText ?? 'Belum ada data.'}</p>;
  return null;
}

export function FileLink({ path }: { path?: string | null }) {
  if (!path) return null;
  return <button type="button" className="link-btn" onClick={() => bukaBerkas(path)}>Lihat berkas</button>;
}

export function Alert({ kind, children }: { kind: 'ok' | 'err' | 'info'; children: ReactNode }) {
  return <p className={`alert alert-${kind}`} role={kind === 'err' ? 'alert' : 'status'}>{children}</p>;
}
