import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  LockKeyhole,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  bestStreak,
  chapters,
  dateOK,
  goalProgress,
  growth,
  isPB,
  maxWeight,
  milestones,
  monthBefore,
  uniqueDays,
  weekDates,
  type Goal,
  type State,
} from "../model";
import {
  Empty,
  Progress,
  SectionHead,
  Stat,
  Title,
  type Persist,
} from "./shared";
function WeightChart({ data }: { data: { date: string; weight: number }[] }) {
  if (!data.length)
    return (
      <Empty title="Let the story unfold.">
        記録を重ねると、ここに変化が描かれます。
      </Empty>
    );
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date)),
    max = Math.max(10, ...sorted.map((d) => d.weight)) * 1.15;
  const minTime = Date.parse(sorted[0].date),
    maxTime = Date.parse(sorted[sorted.length - 1].date);
  const x = (d: { date: string }) =>
    sorted.length === 1
      ? 350
      : 55 +
        ((Date.parse(d.date) - minTime) / Math.max(maxTime - minTime, 1)) * 595;
  const y = (d: { weight: number }) => 210 - (d.weight / max) * 170;
  const points = sorted.map((d) => `${x(d)},${y(d)}`).join(" ");
  return (
    <div className="chart-wrap">
      <svg
        className="weight-chart"
        viewBox="0 0 700 270"
        role="img"
        aria-label={`最大重量の推移。${sorted.map((d) => `${d.date}: ${d.weight}kg`).join("、")}`}
      >
        <defs>
          <linearGradient id="chart-shade" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#333" stopOpacity=".14" />
            <stop offset="1" stopColor="#333" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <line
              x1="55"
              x2="650"
              y1={40 + (i * 170) / 3}
              y2={40 + (i * 170) / 3}
              stroke="#d8d8d4"
              strokeDasharray="2 5"
            />
            <text x="38" y={44 + (i * 170) / 3} textAnchor="end">
              {Math.round(max * (1 - i / 3))}
            </text>
          </g>
        ))}
        <polygon points={`55,210 ${points} 650,210`} fill="url(#chart-shade)" />
        <polyline
          points={points}
          fill="none"
          stroke="#242424"
          strokeWidth="2"
        />
        {sorted.map((d, i) => (
          <circle
            key={i}
            cx={x(d)}
            cy={y(d)}
            r="3.5"
            fill="#f6f5f2"
            stroke="#222"
            strokeWidth="1.5"
          />
        ))}
        <text x="55" y="244">
          {sorted[0].date.replaceAll("-", ".")}
        </text>
        <text x="650" y="244" textAnchor="end">
          {sorted[sorted.length - 1].date.replaceAll("-", ".")}
        </text>
        <text x="55" y="20">
          MAX WEIGHT / kg
        </text>
      </svg>
      <details className="chart-data">
        <summary>グラフの数値を見る</summary>
        <table>
          <thead>
            <tr>
              <th>日付</th>
              <th>最大重量</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr key={d.date}>
                <td>{d.date}</td>
                <td>{d.weight} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
export default function Growth({
  state,
  today,
  persist,
  busy,
}: {
  state: State;
  today: string;
  persist: Persist;
  busy: boolean;
}) {
  const [period, setPeriod] = useState(1),
    [exerciseId, setExerciseId] = useState(state.exercises[0]?.id ?? ""),
    [goalEditor, setGoalEditor] = useState<Partial<Goal> | null>(null),
    [letterText, setLetterText] = useState(""),
    [unlock, setUnlock] = useState(""),
    [error, setError] = useState("");
  const g = growth(state),
    cutoff = monthBefore(today, period),
    past = state.entries.filter((e) => e.date <= cutoff),
    now = state.entries.filter((e) => e.date <= today),
    exercise =
      state.exercises.find((e) => e.id === exerciseId) ?? state.exercises[0];
  const thenEntries = past.filter((e) => e.exerciseId === exercise?.id),
    currentEntries = now.filter((e) => e.exerciseId === exercise?.id);
  const enough =
    thenEntries.length > 0 && currentEntries.some((e) => e.date > cutoff);
  const chartDates = [...new Set(currentEntries.map((e) => e.date))]
      .sort()
      .slice(-80),
    chartData = chartDates.map((date) => ({
      date,
      weight: maxWeight(currentEntries.filter((e) => e.date === date)),
    }));
  async function submitGoal(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    const f = new FormData(ev.currentTarget),
      kind = f.get("kind") as Goal["kind"];
    const title = f.get("title")!.toString().trim(),
      target = kind === "personal" ? 1 : Number(f.get("target"));
    if (
      !title ||
      !Number.isFinite(target) ||
      target <= 0 ||
      target > (kind === "weekly" ? 7 : 2000) ||
      (kind === "weekly" && !Number.isInteger(target))
    ) {
      setError("目標と正しい数値を入力してください。週間目標は1〜7日です。");
      return;
    }
    const ex = f.get("exerciseId")?.toString();
    if (kind === "weight" && !state.exercises.some((e) => e.id === ex)) {
      setError(
        "重量目標の種目を選んでください。種目はトレーニング画面で追加できます。",
      );
      return;
    }
    const goal: Goal = {
      id: goalEditor?.id ?? crypto.randomUUID(),
      title,
      kind,
      target,
      exerciseId: kind === "weight" ? ex : undefined,
      done: goalEditor?.done ?? false,
    };
    if (
      await persist(
        {
          ...state,
          goals: [...state.goals.filter((x) => x.id !== goal.id), goal],
        },
        "あなたの目標を保存しました。",
      )
    )
      setGoalEditor(null);
  }
  async function submitLetter(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!dateOK(unlock) || unlock <= today || !letterText.trim()) {
      setError("明日以降の日付とメッセージを入力してください。");
      return;
    }
    if (
      await persist(
        {
          ...state,
          letters: [
            ...state.letters,
            {
              id: crypto.randomUUID(),
              text: letterText.trim(),
              unlockDate: unlock,
              createdAt: new Date().toISOString(),
            },
          ],
        },
        "未来のあなたへ、手紙を残しました。",
      )
    ) {
      setLetterText("");
      setUnlock("");
    }
  }
  return (
    <>
      <Title
        index="04"
        title="Look how far."
        japanese="成長とこれから"
        description="比べるのは、過去の自分。見えなかった変化が、ここにある。"
      />
      <section className="chapter-feature">
        <div>
          <span className="eyebrow">YOUR CURRENT CHAPTER</span>
          <h2>
            <span>{String(g.chapter + 1).padStart(2, "0")}</span>
            {g.rank}
            <em>.</em>
          </h2>
          <p>
            LEVEL {g.level} <span>/</span> {g.xp.toLocaleString()} XP
          </p>
        </div>
        <div>
          <span>
            {g.next ? `NEXT CHAPTER — ${g.next.name}` : "THE STORY GOES ON"}
          </span>
          <Progress label="次の章まで" value={g.chapterProgress} />
          <p>
            {g.next
              ? `あと ${g.remaining} XP。すべては、実際の積み重ねから。`
              : "最終章に到達しても、レベルと記録は育ち続けます。"}
          </p>
        </div>
      </section>
      <div className="chapter-path">
        {chapters.map((c, i) => (
          <div key={c.name} className={i <= g.chapter ? "reached" : ""}>
            <span>CHAPTER 0{i + 1}</span>
            <strong>{c.name}</strong>
            <small>
              LEVEL {c.level}
              {i < g.chapter ? " / REACHED" : ""}
            </small>
          </div>
        ))}
      </div>
      <section className="comparison-section">
        <SectionHead number="01" title="THEN & NOW">
          <div className="segmented">
            {[1, 3].map((n) => (
              <button
                key={n}
                aria-pressed={period === n}
                className={period === n ? "selected" : ""}
                onClick={() => setPeriod(n)}
              >
                {n}か月前
              </button>
            ))}
          </div>
        </SectionHead>
        <div className="comparison-toolbar">
          <p>
            {cutoff.replaceAll("-", ".")} <ArrowRight size={14} />{" "}
            {today.replaceAll("-", ".")}
          </p>
          <label className="select-label">
            種目
            <select
              aria-label="比較する種目"
              value={exercise?.id ?? ""}
              onChange={(e) => setExerciseId(e.target.value)}
            >
              {!state.exercises.length && (
                <option value="">記録後に選択できます</option>
              )}
              {state.exercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {enough ? (
          <div className="comparison-stats">
            <Stat
              label="THEN / MAX WEIGHT"
              value={maxWeight(thenEntries)}
              unit="kg"
              note={`${period}か月前までの最大重量`}
            />
            <Stat
              label="NOW / MAX WEIGHT"
              value={maxWeight(currentEntries)}
              unit="kg"
              note={`+${maxWeight(currentEntries) - maxWeight(thenEntries)} kg の変化`}
            />
            <Stat
              label="DAYS OF TRAINING"
              value={uniqueDays(now)}
              unit="DAYS"
              note={`${period}か月前 ${uniqueDays(past)}日 → 現在`}
            />
            <Stat
              label="LONGEST RUN"
              value={bestStreak(now)}
              unit="DAYS"
              note={`最長連続日数・以前は${bestStreak(past)}日`}
            />
          </div>
        ) : (
          <div className="beginning-note">
            <span>THIS IS YOUR BEGINNING.</span>
            <p>まだ、比べなくていい。</p>
            <small>
              {period}か月前までの記録と、それ以降の記録が揃うと比較できます。
              <br />
              今は、最初のページを育てていきましょう。
            </small>
          </div>
        )}
        <WeightChart data={chartData} />
        <div className="comparison-bottom">
          <p>
            累計トレーニング <strong>{uniqueDays(now)}日</strong> / {now.length}
            種目記録
          </p>
          <span>
            同日の同種目は最大重量を表示。休息は継続の失敗として扱いません。
          </span>
        </div>
        <div className="pb-table">
          <SectionHead title="PERSONAL BEST UPDATES" />
          {state.exercises.length ? (
            <table>
              <thead>
                <tr>
                  <th>種目</th>
                  <th>{period}か月前まで</th>
                  <th>現在の最大重量</th>
                  <th>期間内のPB更新</th>
                </tr>
              </thead>
              <tbody>
                {state.exercises.map((ex) => (
                  <tr key={ex.id}>
                    <th>{ex.name}</th>
                    <td>
                      {past.some((e) => e.exerciseId === ex.id)
                        ? `${maxWeight(past.filter((e) => e.exerciseId === ex.id))} kg`
                        : "—"}
                    </td>
                    <td>
                      {maxWeight(now.filter((e) => e.exerciseId === ex.id))} kg
                    </td>
                    <td>
                      {
                        state.entries.filter(
                          (e) =>
                            e.exerciseId === ex.id &&
                            e.date > cutoff &&
                            e.date <= today &&
                            isPB(e, state.entries),
                        ).length
                      }{" "}
                      ↗
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="field-note">
              トレーニングを記録すると、種目ごとの変化を確認できます。
            </p>
          )}
        </div>
      </section>
      <section className="goals-section">
        <SectionHead number="02" title="PERSONAL GOALS">
          <button
            className="text-link"
            onClick={() => {
              setGoalEditor({ kind: "personal" });
              setError("");
            }}
          >
            <Plus size={16} />
            目標を追加
          </button>
        </SectionHead>
        {goalEditor && (
          <form
            className="panel goal-form"
            onSubmit={submitGoal}
            key={goalEditor.id ?? "new"}
          >
            <h3>{goalEditor.id ? "目標を編集" : "小さな目標を、ひとつ。"}</h3>
            <label>
              目標
              <input
                name="title"
                required
                maxLength={100}
                defaultValue={goalEditor.title}
                placeholder="例：自分のペースで週3日"
              />
            </label>
            <div className="form-two">
              <label>
                進捗の種類
                <select
                  name="kind"
                  value={goalEditor.kind}
                  onChange={(e) =>
                    setGoalEditor({
                      ...goalEditor,
                      kind: e.target.value as Goal["kind"],
                    })
                  }
                >
                  <option value="personal">自由な目標（手動で達成）</option>
                  <option value="weekly">週のトレーニング日数</option>
                  <option value="weight">種目の最大重量</option>
                </select>
              </label>
              {goalEditor.kind !== "personal" && (
                <label>
                  {goalEditor.kind === "weekly"
                    ? "目標日数 / 週"
                    : "目標重量 / kg"}
                  <input
                    name="target"
                    type="number"
                    min={goalEditor.kind === "weekly" ? 1 : 0.1}
                    max={goalEditor.kind === "weekly" ? 7 : 2000}
                    step={goalEditor.kind === "weekly" ? 1 : 0.1}
                    required
                    defaultValue={goalEditor.target}
                  />
                </label>
              )}
            </div>
            {goalEditor.kind === "weight" && (
              <label>
                種目
                <select
                  name="exerciseId"
                  defaultValue={goalEditor.exerciseId}
                  required
                >
                  <option value="">種目を選択</option>
                  {state.exercises.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="button-row">
              <button className="button primary" disabled={busy}>
                目標を保存
                <Check size={16} />
              </button>
              <button
                className="button secondary"
                type="button"
                onClick={() => setGoalEditor(null)}
              >
                閉じる
              </button>
            </div>
          </form>
        )}
        <div className="goal-grid">
          {state.goals.map((goal) => {
            const progress = goalProgress(goal, state, today);
            return (
              <article className="goal-card" key={goal.id}>
                <div className="goal-top">
                  <span>
                    {goal.kind === "weekly"
                      ? "WEEKLY RHYTHM"
                      : goal.kind === "weight"
                        ? "PERSONAL BEST"
                        : "YOUR OWN GOAL"}
                  </span>
                  <div>
                    <button
                      className="icon-button"
                      aria-label={`${goal.title}の目標を編集`}
                      onClick={() => setGoalEditor(goal)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`${goal.title}の目標を削除`}
                      disabled={busy}
                      onClick={() => {
                        if (
                          confirm(
                            "この目標を削除しますか？記録は削除されません。",
                          )
                        )
                          void persist(
                            {
                              ...state,
                              goals: state.goals.filter(
                                (g) => g.id !== goal.id,
                              ),
                            },
                            "目標を削除しました。",
                          );
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3>{goal.title}</h3>
                <div className="goal-number">
                  {Math.round(Math.min(progress, 1) * 100)}
                  <small>%</small>
                  <span>{progress >= 1 ? "ACHIEVED" : "IN PROGRESS"}</span>
                </div>
                <Progress value={progress} label={`${goal.title}の進捗`} />
                {goal.kind === "personal" ? (
                  <button
                    className="text-link"
                    disabled={busy}
                    onClick={() =>
                      persist(
                        {
                          ...state,
                          goals: state.goals.map((g) =>
                            g.id === goal.id ? { ...g, done: !g.done } : g,
                          ),
                        },
                        goal.done
                          ? "目標を進行中に戻しました。"
                          : "目標を達成しました。",
                      )
                    }
                  >
                    {goal.done ? "進行中に戻す" : "達成したことを残す"}
                    <Check size={15} />
                  </button>
                ) : (
                  <p>
                    {goal.kind === "weekly"
                      ? `今週 ${Math.round(progress * goal.target)} / ${goal.target} 日（毎週月曜更新）`
                      : `最大重量 ${Math.round(progress * goal.target * 10) / 10} / ${goal.target} kg`}
                  </p>
                )}
              </article>
            );
          })}
        </div>
        {!state.goals.length && !goalEditor && (
          <Empty title="Something to move toward.">
            誰かと比べるためではない、あなた自身の目標を。
          </Empty>
        )}
      </section>
      <section className="milestones-section">
        <SectionHead number="03" title="MILESTONES" />
        <div className="milestones-list">
          {milestones(state).map((m, i) => (
            <div key={m.title} className={m.date ? "earned" : ""}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{m.title}</h3>
                <p>{m.description}</p>
              </div>
              <time>{m.date?.replaceAll("-", ".") ?? "SOMEDAY"}</time>
              {m.date ? (
                <Check size={17} />
              ) : (
                <span className="milestone-open">○</span>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="weekly-objectives">
        <SectionHead title="THIS WEEK, AT YOUR PACE" />
        {[
          {
            name: "2日、自分のために",
            value: uniqueDays(
              state.entries.filter((e) =>
                weekDates(new Date(today + "T12:00:00")).includes(e.date),
              ),
            ),
            target: 2,
          },
          {
            name: "10セットの積み重ね",
            value: state.entries
              .filter((e) =>
                weekDates(new Date(today + "T12:00:00")).includes(e.date),
              )
              .reduce((n, e) => n + e.sets.length, 0),
            target: 10,
          },
          {
            name: "休息日をひとつ残す",
            value: state.rests.filter((d) =>
              weekDates(new Date(today + "T12:00:00")).includes(d),
            ).length,
            target: 1,
          },
        ].map((m) => (
          <div className="weekly-objective" key={m.name}>
            <span>{m.name}</span>
            <Progress value={m.value / m.target} label={m.name} />
            <small>
              {Math.min(m.value, m.target)} / {m.target}
            </small>
          </div>
        ))}
      </section>
      <section className="letters-section">
        <SectionHead number="04" title="LETTER TO FUTURE SELF" />
        <div className="letters-layout">
          <form onSubmit={submitLetter} className="panel letter-form">
            <span className="eyebrow">DEAR FUTURE ME,</span>
            <h3>
              未来の自分へ、
              <br />
              <em>今の言葉を。</em>
            </h3>
            <label>
              メッセージ
              <textarea
                rows={5}
                maxLength={3000}
                value={letterText}
                onChange={(e) => setLetterText(e.target.value)}
                required
                placeholder="その日の自分に、伝えたいこと。"
              />
            </label>
            <label>
              開封できる日
              <input
                type="date"
                value={unlock}
                required
                min={(() => {
                  const d = new Date(today + "T12:00:00");
                  d.setDate(d.getDate() + 1);
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                })()}
                onChange={(e) => setUnlock(e.target.value)}
              />
            </label>
            <button className="button primary wide" disabled={busy}>
              手紙を預ける
              <ArrowUpRight size={17} />
            </button>
            <p className="field-note">
              指定日以降に画面上で読めます。端末内の保存・JSONには平文で含まれます。暗号化や通知機能ではありません。
            </p>
          </form>
          <div>
            {state.letters.length ? (
              state.letters.map((l) => (
                <article key={l.id} className="letter-card">
                  <div className="letter-meta">
                    <span>
                      {l.unlockDate <= today ? "OPEN LETTER" : "TO BE OPENED"}
                    </span>
                    <span>{l.unlockDate.replaceAll("-", ".")}</span>
                  </div>
                  {l.unlockDate <= today ? (
                    <p>{l.text}</p>
                  ) : (
                    <div className="sealed-letter">
                      <LockKeyhole size={24} />
                      <h3>Until that day.</h3>
                      <p>その日のあなたを、待っています。</p>
                    </div>
                  )}
                  <button
                    className="icon-button"
                    disabled={busy}
                    aria-label={`${l.unlockDate}の手紙を削除`}
                    onClick={() => {
                      if (confirm("この手紙を削除しますか？"))
                        void persist(
                          {
                            ...state,
                            letters: state.letters.filter((x) => x.id !== l.id),
                          },
                          "手紙を削除しました。",
                        );
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              ))
            ) : (
              <Empty title="For who you’ll become.">
                未来の自分への手紙が、ここに届きます。
              </Empty>
            )}
          </div>
        </div>
      </section>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
