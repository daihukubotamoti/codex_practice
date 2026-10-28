import { useState, type FormEvent } from "react";
import { ArrowUpRight, Check, Copy, Plus, X } from "lucide-react";
import { dateOK, type Entry, type State } from "../model";
import { Empty, SectionHead, Title, type Persist } from "./shared";
export type TrainingDraft = {
  date: string;
  name: string;
  sets: { weight: string; reps: string }[];
  minutes: string;
  editing: string | null;
};
export const blankTraining = (date: string): TrainingDraft => ({
  date,
  name: "",
  sets: [{ weight: "", reps: "" }],
  minutes: "",
  editing: null,
});
export const entryDraft = (e: Entry): TrainingDraft => ({
  date: e.date,
  name: e.name,
  sets: e.sets.map((s) => ({ weight: String(s.weight), reps: String(s.reps) })),
  minutes: e.minutes === undefined ? "" : String(e.minutes),
  editing: e.id,
});
export default function Training({
  state,
  today,
  draft,
  onDraft,
  persist,
  busy,
  onSaved,
}: {
  state: State;
  today: string;
  draft: TrainingDraft;
  onDraft: (d: TrainingDraft) => void;
  persist: Persist;
  busy: boolean;
  onSaved: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const patch = (p: Partial<TrainingDraft>) => onDraft({ ...draft, ...p });
  const exercise = state.exercises.find((e) => e.name === draft.name.trim());
  const previous = [...state.entries]
    .filter((e) => e.exerciseId === exercise?.id && e.id !== draft.editing)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )[0];
  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setError("");
    const name = draft.name.trim();
    if (
      !name ||
      name.length > 60 ||
      !dateOK(draft.date) ||
      draft.date > today
    ) {
      setError("種目名と今日以前の正しい日付を入力してください。");
      return;
    }
    if (
      draft.sets.some(
        (s) =>
          !s.weight.trim() ||
          !s.reps.trim() ||
          !Number.isFinite(Number(s.weight)) ||
          Number(s.weight) < 0 ||
          Number(s.weight) > 2000 ||
          !Number.isInteger(Number(s.reps)) ||
          Number(s.reps) < 1 ||
          Number(s.reps) > 10000,
      )
    ) {
      setError("重量は0〜2000kg、回数は1〜10000の整数で入力してください。");
      return;
    }
    if (
      draft.minutes !== "" &&
      (!Number.isInteger(Number(draft.minutes)) ||
        Number(draft.minutes) < 0 ||
        Number(draft.minutes) > 1440)
    ) {
      setError("時間は0〜1440分の整数で入力してください。");
      return;
    }
    if (draft.editing && !state.entries.some((e) => e.id === draft.editing)) {
      setError(
        "編集元の記録が見つかりません。新しい記録に切り替えてください。",
      );
      return;
    }
    const ex = exercise ?? { id: crypto.randomUUID(), name };
    const old = state.entries.find((e) => e.id === draft.editing);
    const entry: Entry = {
      id: draft.editing ?? crypto.randomUUID(),
      date: draft.date,
      name,
      exerciseId: ex.id,
      sets: draft.sets.map((s) => ({
        weight: Number(s.weight),
        reps: Number(s.reps),
      })),
      createdAt: old?.createdAt ?? new Date().toISOString(),
      ...(draft.minutes !== "" ? { minutes: Number(draft.minutes) } : {}),
    };
    if (
      await persist(
        {
          ...state,
          exercises: exercise ? state.exercises : [...state.exercises, ex],
          entries: [
            ...state.entries.filter((e) => e.id !== draft.editing),
            entry,
          ],
          rests: state.rests.filter((d) => d !== draft.date),
        },
        draft.editing
          ? "トレーニングを更新しました。"
          : "今日の積み重ねを保存しました。",
      )
    )
      await onSaved();
  }
  return (
    <>
      <Title
        index="01"
        title="Put in the work."
        japanese="トレーニング"
        description="完璧な一日より、今日のひとつ。"
      />
      <div className="training-layout">
        <form className="training-form panel" onSubmit={submit}>
          <SectionHead
            number="01"
            title={draft.editing ? "EDIT YOUR RECORD" : "TODAY’S SESSION"}
          />
          <div className="form-two">
            <label>
              トレーニングした日
              <input
                type="date"
                max={today}
                value={draft.date}
                required
                onChange={(e) => patch({ date: e.target.value })}
              />
            </label>
            <label>
              トレーニング時間{" "}
              <span className="optional">任意・この種目の所要時間</span>
              <div className="unit-input">
                <input
                  aria-label="トレーニング時間"
                  type="number"
                  min="0"
                  max="1440"
                  step="1"
                  inputMode="numeric"
                  placeholder="—"
                  value={draft.minutes}
                  onChange={(e) => patch({ minutes: e.target.value })}
                />
                <span>MIN</span>
              </div>
            </label>
          </div>
          <label>
            種目名 <span className="optional">自由に入力</span>
            <input
              placeholder="例：ベンチプレス"
              maxLength={60}
              required
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </label>
          {state.exercises.length > 0 && (
            <div className="chips" aria-label="登録した種目">
              {state.exercises.map((e) => (
                <button
                  type="button"
                  key={e.id}
                  className={exercise?.id === e.id ? "selected" : ""}
                  onClick={() => patch({ name: e.name })}
                >
                  {e.name}
                </button>
              ))}
            </div>
          )}
          <div className="sets-head">
            <h3>SET BY SET</h3>
            <span>自重トレーニングは 0 kg</span>
          </div>
          <div className="set-head">
            <span>SET</span>
            <span>WEIGHT / kg</span>
            <span>REPS</span>
            <span />
          </div>
          {draft.sets.map((s, i) => (
            <div className="set-row" key={i}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <input
                aria-label={`${i + 1}セット目の重量`}
                required
                type="number"
                min="0"
                max="2000"
                step="0.1"
                inputMode="decimal"
                placeholder="0"
                value={s.weight}
                onChange={(e) =>
                  patch({
                    sets: draft.sets.map((x, j) =>
                      i === j ? { ...x, weight: e.target.value } : x,
                    ),
                  })
                }
              />
              <input
                aria-label={`${i + 1}セット目の回数`}
                required
                type="number"
                min="1"
                max="10000"
                step="1"
                inputMode="numeric"
                placeholder="10"
                value={s.reps}
                onChange={(e) =>
                  patch({
                    sets: draft.sets.map((x, j) =>
                      i === j ? { ...x, reps: e.target.value } : x,
                    ),
                  })
                }
              />
              <button
                type="button"
                className="icon-button"
                aria-label={`${i + 1}セット目を削除`}
                disabled={draft.sets.length === 1}
                onClick={() =>
                  patch({ sets: draft.sets.filter((_, j) => i !== j) })
                }
              >
                <X size={17} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="add-set"
            disabled={draft.sets.length >= 100}
            onClick={() =>
              patch({
                sets: [...draft.sets, { ...draft.sets[draft.sets.length - 1] }],
              })
            }
          >
            <Plus size={16} />
            セットを追加
          </button>
          <div className="form-summary">
            <span>{draft.sets.length} SETS</span>
            <span>BASE +{draft.sets.length * 10} XP</span>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary wide" disabled={busy} type="submit">
            {busy
              ? "保存中…"
              : draft.editing
                ? "記録を更新する"
                : "トレーニングを保存"}
            <Check size={18} />
          </button>
          <div className="form-bottom">
            <span>入力途中の内容も端末内に保存</span>
            <button
              type="button"
              onClick={() => {
                if (confirm("入力中の内容を消して、新しい記録を始めますか？"))
                  onDraft(blankTraining(today));
              }}
            >
              入力をクリア
            </button>
          </div>
        </form>
        <aside className="training-aside">
          <section className="panel previous">
            <SectionHead title="LAST TIME" />
            <p className="section-jp">前回の自分から、もう一歩。</p>
            {previous ? (
              <>
                <span className="date-code">
                  {previous.date.replaceAll("-", ".")}
                </span>
                <h3>{previous.name}</h3>
                {previous.sets.map((s, i) => (
                  <div className="previous-set" key={i}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <strong>
                      {s.weight}
                      <small>kg</small>
                    </strong>
                    <span>×</span>
                    <strong>
                      {s.reps}
                      <small>reps</small>
                    </strong>
                  </div>
                ))}
                <button
                  type="button"
                  className="button secondary wide"
                  onClick={() =>
                    patch({
                      sets: previous.sets.map((s) => ({
                        weight: String(s.weight),
                        reps: String(s.reps),
                      })),
                    })
                  }
                >
                  <Copy size={16} />
                  前回のセットを引き継ぐ
                </button>
              </>
            ) : (
              <Empty title="Your own starting point.">
                種目を選ぶと前回の記録が表示されます。
              </Empty>
            )}
          </section>
          <section className="quiet-note">
            <span className="eyebrow">A NOTE TO YOURSELF</span>
            <p>
              誰かのペースではなく、
              <br />
              自分のリズムで。
            </p>
            <ArrowUpRight size={21} />
            <small>
              1セット 10 XP / 自己ベスト +20 XP
              <br />
              休息で、レベルが下がることはありません。
            </small>
          </section>
        </aside>
      </div>
    </>
  );
}
