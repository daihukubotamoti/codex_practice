import type { ReactNode } from "react";
import { ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { isPB, type Entry, type State } from "../model";
export type Persist = (next: State, message: string) => Promise<boolean>;
export const longDate = (d: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(d + "T12:00:00"));
export const shortDate = (d: string) => d.replaceAll("-", ".");
export const pad = (n: number) => String(n).padStart(2, "0");
export function Title({
  index,
  title,
  japanese,
  description,
  action,
}: {
  index: string;
  title: string;
  japanese: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div className="eyebrow">
        {index} / {japanese}
      </div>
      <div className="title-line">
        <h1>{title}</h1>
        {action}
      </div>
      <p>{description}</p>
    </header>
  );
}
export function Empty({
  title = "Your story starts here.",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-plus">＋</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.max(0, Math.min(1, value)) * 100)}
    >
      <span style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}
export function Stat({
  value,
  label,
  unit,
  note,
}: {
  value: ReactNode;
  label: string;
  unit?: string;
  note?: string;
}) {
  return (
    <div className="stat">
      <span className="eyebrow">{label}</span>
      <div className="stat-value">
        {value}
        <small>{unit}</small>
      </div>
      {note && <p>{note}</p>}
    </div>
  );
}
export function SectionHead({
  number,
  title,
  children,
}: {
  number?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-head">
      <h2>
        {number && <span>{number}</span>}
        {title}
      </h2>
      {children}
    </div>
  );
}
export function TextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={16} />
    </button>
  );
}
export function EntryList({
  entries,
  state,
  busy,
  edit,
  persist,
}: {
  entries: Entry[];
  state: State;
  busy: boolean;
  edit: (e: Entry) => void;
  persist: Persist;
}) {
  if (!entries.length)
    return <Empty>記録のない日にも、あなたの時間は流れています。</Empty>;
  return (
    <div className="entry-list">
      {entries.map((e) => (
        <article className="entry-row" key={e.id}>
          <div className="entry-date">
            <span>{e.date.slice(5, 7)}</span>
            <strong>{e.date.slice(8)}</strong>
          </div>
          <div className="entry-content">
            <div className="entry-name">
              <h3>{e.name}</h3>
              {isPB(e, state.entries) && (
                <span className="pb-mark">↗ PERSONAL BEST</span>
              )}
            </div>
            <div className="entry-sets">
              {e.sets.map((s, i) => (
                <span key={i}>
                  {s.weight}
                  <small>kg</small> × {s.reps}
                  <small>reps</small>
                </span>
              ))}
            </div>
            <p>
              {e.sets.length} SETS
              {e.minutes !== undefined ? ` / ${e.minutes} MIN` : ""}
            </p>
          </div>
          <button
            className="icon-button"
            aria-label={`${e.name}の記録を編集`}
            onClick={() => edit(e)}
          >
            <Pencil size={17} />
          </button>
          <button
            className="icon-button"
            aria-label={`${e.name}の記録を削除`}
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  "この記録を削除しますか？この記録に基づくXPも再計算されます。",
                )
              )
                void persist(
                  {
                    ...state,
                    entries: state.entries.filter((x) => x.id !== e.id),
                  },
                  "記録を削除しました。",
                );
            }}
          >
            <Trash2 size={17} />
          </button>
        </article>
      ))}
    </div>
  );
}
