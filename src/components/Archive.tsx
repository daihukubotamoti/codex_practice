import { useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { isPB, localDate, type Entry, type State } from "../model";
import { moods } from "./Journal";
import {
  Empty,
  EntryList,
  SectionHead,
  Title,
  longDate,
  type Persist,
} from "./shared";
export default function Archive({
  state,
  today,
  edit,
  start,
  journal,
  persist,
  busy,
}: {
  state: State;
  today: string;
  edit: (e: Entry) => void;
  start: (date: string) => void;
  journal: (date: string) => void;
  persist: Persist;
  busy: boolean;
}) {
  const [selected, setSelected] = useState(today),
    [month, setMonth] = useState(
      () => new Date(today.slice(0, 7) + "-01T12:00:00"),
    );
  const dayJournal = state.journals.find((j) => j.date === selected),
    rest = state.rests.includes(selected),
    entries = state.entries.filter((e) => e.date === selected);
  const pbs = new Set(
    state.entries.filter((e) => isPB(e, state.entries)).map((e) => e.date),
  );
  return (
    <>
      <Title
        index="03"
        title="Every day, a page."
        japanese="パーソナルアーカイブ"
        description="がんばった日も、立ち止まった日も。ここに残る、あなたの時間。"
      />
      <div className="archive-layout">
        <section className="panel calendar-panel">
          <SectionHead title="PERSONAL ARCHIVE" />
          <div className="calendar-heading">
            <div>
              <span>{month.getFullYear()}</span>
              <h2>
                {new Intl.DateTimeFormat("en-US", { month: "long" }).format(
                  month,
                )}
                <em>.</em>
              </h2>
            </div>
            <div>
              <button
                className="icon-button"
                aria-label="前の月"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
              >
                <ChevronLeft size={20} />
              </button>
              <button
                className="icon-button"
                aria-label="次の月"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          <div className="calendar-grid">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span className="calendar-weekday" key={i}>
                {d}
              </span>
            ))}
            {Array.from({ length: (month.getDay() + 6) % 7 }, (_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from(
              {
                length: new Date(
                  month.getFullYear(),
                  month.getMonth() + 1,
                  0,
                ).getDate(),
              },
              (_, i) => {
                const d = localDate(
                  new Date(month.getFullYear(), month.getMonth(), i + 1),
                );
                const training = state.entries.some((e) => e.date === d),
                  writing = state.journals.some((j) => j.date === d),
                  restDay = state.rests.includes(d);
                return (
                  <button
                    key={d}
                    aria-label={`${d}${training ? " トレーニング" : ""}${writing ? " 日記" : ""}${restDay ? " 休息" : ""}${pbs.has(d) ? " 自己ベスト" : ""}`}
                    aria-pressed={selected === d}
                    className={`${selected === d ? "selected" : ""} ${d === today ? "today" : ""} ${training ? "training-day" : ""}`}
                    onClick={() => setSelected(d)}
                  >
                    <span>{i + 1}</span>
                    <span className="day-marks">
                      {training && <i>●</i>}
                      {writing && <i>○</i>}
                      {restDay && <i>—</i>}
                      {pbs.has(d) && <i>↗</i>}
                    </span>
                  </button>
                );
              },
            )}
          </div>
          <div className="calendar-legend">
            <span>● トレーニング</span>
            <span>○ 日記</span>
            <span>— 休息</span>
            <span>↗ 自己ベスト</span>
          </div>
          <p className="field-note">
            空白の日も、休息の日も。どちらも、あなたのペース。
          </p>
        </section>
        <section className="archive-detail">
          <div className="archive-day-title">
            <span className="eyebrow">A PAGE FROM YOUR LIFE</span>
            <h2>
              {selected.slice(5).replace("-", " / ")}
              <span>{selected.slice(0, 4)}</span>
            </h2>
            <p>{longDate(selected)}</p>
          </div>
          <SectionHead title="TRAINING">
            {selected <= today && (
              <button className="text-link" onClick={() => start(selected)}>
                記録を追加
                <ArrowUpRight size={16} />
              </button>
            )}
          </SectionHead>
          <EntryList
            entries={entries}
            state={state}
            busy={busy}
            edit={edit}
            persist={persist}
          />
          {rest && (
            <div className="archive-rest">
              <strong>— REST DAY</strong>
              <p>休息も、成長を支える時間。</p>
              <button
                className="text-link"
                disabled={busy}
                onClick={() =>
                  persist(
                    {
                      ...state,
                      rests: state.rests.filter((d) => d !== selected),
                    },
                    "休息日の記録を取り消しました。",
                  )
                }
              >
                休息日の記録を取り消す
              </button>
            </div>
          )}
          <SectionHead title="JOURNAL">
            {selected <= today && (
              <button
                className="icon-button"
                aria-label="選択した日の日記を書く"
                onClick={() => journal(selected)}
              >
                <Pencil size={17} />
              </button>
            )}
          </SectionHead>
          {dayJournal ? (
            <article className="archive-journal">
              <span className="mood-caption">
                {moods.find((m) => m.value === dayJournal.mood)?.symbol}{" "}
                {moods.find((m) => m.value === dayJournal.mood)?.label}
              </span>
              {dayJournal.photo && (
                <img src={dayJournal.photo} alt={`${selected}の日記の写真`} />
              )}
              <p className="journal-effort">{dayJournal.effort}</p>
              <blockquote>{dayJournal.message}</blockquote>
              <button
                className="text-link"
                disabled={busy}
                onClick={() => {
                  if (confirm("この日の日記と写真を削除しますか？"))
                    void persist(
                      {
                        ...state,
                        journals: state.journals.filter(
                          (j) => j.date !== selected,
                        ),
                      },
                      "日記を削除しました。",
                    );
                }}
              >
                <Trash2 size={15} />
                日記を削除
              </button>
            </article>
          ) : (
            <Empty title="Room for a little reflection.">
              この日の日記は、まだありません。
            </Empty>
          )}
        </section>
      </div>
    </>
  );
}
