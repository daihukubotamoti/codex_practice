import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Share2, X } from "lucide-react";
import { summary, type State } from "../model";
import { downloadBlob, reviewImage } from "../media";
import { Empty, SectionHead, Stat, Title, pad } from "./shared";
export default function Review({
  state,
  today,
}: {
  state: State;
  today: string;
}) {
  const [mode, setMode] = useState<"month" | "year">("month"),
    [month, setMonth] = useState(today.slice(0, 7)),
    [year, setYear] = useState(today.slice(0, 4)),
    [creating, setCreating] = useState(false),
    [image, setImage] = useState<{ blob: Blob; url: string } | null>(null),
    [error, setError] = useState("");
  const exportButton = useRef<HTMLButtonElement>(null);
  const closeImage = () => {
    setImage(null);
    exportButton.current?.focus();
  };
  const period = mode === "month" ? month : year,
    stats = summary(state, period);
  const d = new Date(month + "-01T12:00:00");
  d.setMonth(d.getMonth() - 1);
  const previous =
    mode === "month"
      ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
      : String(Number(year) - 1);
  const prev = summary(state, previous),
    prior = mode === "month" ? "前月" : "前年";
  const date = new Date(
    (mode === "month" ? month : year + "-01") + "-01T12:00:00",
  );
  const words = [...stats.journals]
    .sort((a, b) => b.date.localeCompare(a.date))
    .find((j) => j.message.trim() || j.effort.trim());
  const dayCount =
    mode === "month"
      ? new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate()
      : 12;
  const bars = Array.from({ length: dayCount }, (_, i) => {
    const prefix =
      mode === "month" ? `${month}-${pad(i + 1)}` : `${year}-${pad(i + 1)}`;
    return {
      label:
        mode === "month"
          ? String(i + 1)
          : new Intl.DateTimeFormat("en-US", { month: "short" }).format(
              new Date(Number(year), i, 1),
            ),
      value: stats.entries
        .filter((e) => e.date.startsWith(prefix))
        .reduce((n, e) => n + e.sets.length, 0),
    };
  });
  const max = Math.max(1, ...bars.map((b) => b.value));
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url);
    },
    [image],
  );
  async function createImage() {
    setCreating(true);
    setError("");
    try {
      const blob = await reviewImage(state, period);
      setImage({ blob, url: URL.createObjectURL(blob) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像を作成できませんでした。");
    } finally {
      setCreating(false);
    }
  }
  return (
    <>
      <Title
        index="05"
        title="The bigger picture."
        japanese="月と年の振り返り"
        description="毎日の点をつなぐと、あなたの輪郭が見えてくる。"
      />
      <div className="review-controls">
        <div className="segmented">
          <button
            className={mode === "month" ? "selected" : ""}
            aria-pressed={mode === "month"}
            onClick={() => setMode("month")}
          >
            MONTHLY
          </button>
          <button
            className={mode === "year" ? "selected" : ""}
            aria-pressed={mode === "year"}
            onClick={() => setMode("year")}
          >
            YEAR IN REVIEW
          </button>
        </div>
        <label className="period-picker">
          {mode === "month" ? "振り返る月" : "振り返る年"}
          {mode === "month" ? (
            <input
              aria-label="振り返る月"
              type="month"
              max={today.slice(0, 7)}
              value={month}
              onChange={(e) => {
                if (/^\d{4}-\d{2}$/.test(e.target.value))
                  setMonth(e.target.value);
              }}
            />
          ) : (
            <select
              aria-label="振り返る年"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {Array.from(
                {
                  length: Math.max(
                    3,
                    Number(today.slice(0, 4)) -
                      Number(
                        [...state.entries, ...state.journals]
                          .map((e) => e.date.slice(0, 4))
                          .sort()[0] ?? today.slice(0, 4),
                      ) +
                      1,
                  ),
                },
                (_, i) => String(Number(today.slice(0, 4)) - i),
              ).map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          )}
        </label>
      </div>
      <section className="review-cover">
        <div>
          <span className="eyebrow">
            {mode === "month" ? "MONTHLY REVIEW" : "YEAR IN REVIEW"} / {period}
          </span>
          <h2>
            {mode === "month"
              ? new Intl.DateTimeFormat("en-US", { month: "long" }).format(date)
              : year}
            <em>.</em>
          </h2>
          <p>
            {mode === "month" ? date.getFullYear() : "A YEAR OF SMALL STEPS"}
            <span> / </span>
            {period === today.slice(0, period.length)
              ? "ここまでの、あなた。"
              : "過ぎた時間に、残ったもの。"}
          </p>
        </div>
        <div className="review-cover-number">
          <span>{pad(stats.days)}</span>
          <small>DAYS YOU CHOSE YOURSELF</small>
        </div>
      </section>
      {stats.records ||
      stats.journals.length ||
      state.rests.some((d) => d.startsWith(period)) ? (
        <>
          <div className="review-stats">
            <Stat
              label="TRAINING DAYS"
              value={pad(stats.days)}
              unit="DAYS"
              note={`${stats.records}種目記録 / ${stats.sets}セット`}
            />
            <Stat
              label="TIME INVESTED"
              value={stats.minutes === null ? "—" : stats.minutes}
              unit={stats.minutes === null ? "" : "MIN"}
              note={
                stats.minutes === null
                  ? "時間の記録はありません"
                  : "時間が入力された種目のみの合計"
              }
            />
            <Stat
              label="NEW PERSONAL BESTS"
              value={pad(stats.pbs)}
              unit="TIMES"
              note="自分を超えた瞬間"
            />
            <Stat
              label="JOURNAL PAGES"
              value={pad(stats.journals.length)}
              unit="PAGES"
              note={`休息 ${state.rests.filter((d) => d.startsWith(period)).length}日もアーカイブに`}
            />
          </div>
          <section className="review-chart">
            <SectionHead title="THE RHYTHM OF YOUR EFFORT">
              <span className="eyebrow">
                SETS / {mode === "month" ? "DAY" : "MONTH"}
              </span>
            </SectionHead>
            <div
              className="bar-chart"
              role="img"
              aria-label={bars
                .map((b) => `${b.label}: ${b.value}セット`)
                .join("、")}
            >
              {bars.map((b, i) => (
                <div key={i}>
                  <span
                    className="bar"
                    style={{
                      height: `${(b.value / max) * 160}px`,
                      minHeight: b.value ? "3px" : "1px",
                    }}
                    title={`${b.label}: ${b.value}セット`}
                  />
                  <small>
                    {mode === "year" || i % 5 === 0 || i === bars.length - 1
                      ? b.label
                      : ""}
                  </small>
                </div>
              ))}
            </div>
            <div className="review-chart-note">
              <p>
                最長連続トレーニング <strong>{stats.streak} 日</strong>
              </p>
              <span>休息も、あなたのリズムの一部です。</span>
            </div>
          </section>
          <div className="review-reflection">
            <div className="review-quote">
              <span className="eyebrow">A LINE TO REMEMBER</span>
              <blockquote>
                {words?.message ||
                  words?.effort ||
                  "変化は、いつも静かに始まっている。"}
              </blockquote>
              <span>
                {words
                  ? `${words.date.replaceAll("-", ".")} / YOUR JOURNAL`
                  : "A NOTE FOR YOUR NEXT CHAPTER"}
              </span>
            </div>
            <div className="review-comparison">
              <SectionHead title={`VS. ${previous.replace("-", " / ")}`} />
              <table>
                <thead>
                  <tr>
                    <th>記録</th>
                    <th>{prior}</th>
                    <th>今回</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      name: "トレーニング日数",
                      before: prev.days,
                      now: stats.days,
                    },
                    { name: "セット数", before: prev.sets, now: stats.sets },
                    {
                      name: "自己ベスト更新",
                      before: prev.pbs,
                      now: stats.pbs,
                    },
                    {
                      name: "最長連続日数",
                      before: prev.streak,
                      now: stats.streak,
                    },
                  ].map((r) => (
                    <tr key={r.name}>
                      <th>{r.name}</th>
                      <td>{prev.records ? r.before : "—"}</td>
                      <td>{r.now}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!prev.records && (
                <p className="field-note">
                  {prior}
                  のトレーニングデータはありません。今の記録が、これからの基準になります。
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        <Empty title="A chapter waiting to be written.">
          この期間のトレーニングや日記はまだありません。
          <br />
          記録が増えるたび、レビューも育ちます。
        </Empty>
      )}
      <section className="export-section">
        <div>
          <span className="eyebrow">KEEP A FRAME OF YOUR PROGRESS</span>
          <h2>
            Your month.
            <br />
            <em>Your cover.</em>
          </h2>
          <p>
            {mode === "year" ? "一年" : "ひと月"}の積み重ねを、1枚の画像に。
            <br />
            自分のために保存しても、誰かと分かち合っても。
          </p>
        </div>
        <button
          className="button primary"
          disabled={creating}
          ref={exportButton}
          onClick={createImage}
        >
          {creating ? "画像を作成中…" : "レビュー画像を作成"}
          <ArrowUpRight size={18} />
        </button>
      </section>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {image && (
        <div className="modal-scrim" role="presentation">
          <section
            className="export-modal"
            role="dialog"
            aria-modal="true"
            aria-label="レビュー画像の保存"
            onKeyDown={(e) => {
              if (e.key === "Escape") closeImage();
              if (e.key === "Tab") {
                const buttons =
                  e.currentTarget.querySelectorAll<HTMLButtonElement>("button");
                if (!buttons.length) return;
                const first = buttons[0],
                  last = buttons[buttons.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <div className="section-head">
              <h2>YOUR PERSONAL COVER</h2>
              <button
                autoFocus
                className="icon-button"
                aria-label="画像プレビューを閉じる"
                onClick={closeImage}
              >
                <X size={20} />
              </button>
            </div>
            <img src={image.url} alt={`${period}の個人レビュー画像`} />
            <div className="button-row">
              <button
                className="button primary"
                onClick={() =>
                  downloadBlob(image.blob, `becoming-${period}.png`)
                }
              >
                <ArrowDownToLine size={17} />
                PNGを保存
              </button>
              <button
                className="button secondary"
                onClick={async () => {
                  const file = new File(
                    [image.blob],
                    `becoming-${period}.png`,
                    { type: "image/png" },
                  );
                  try {
                    if (navigator.canShare?.({ files: [file] }))
                      await navigator.share({
                        files: [file],
                        title: "BECOMING. / " + period,
                      });
                    else downloadBlob(image.blob, `becoming-${period}.png`);
                  } catch (e) {
                    if (!(e instanceof DOMException && e.name === "AbortError"))
                      setError(
                        "共有できませんでした。PNGを保存してご利用ください。",
                      );
                  }
                }}
              >
                <Share2 size={17} />
                共有する
              </button>
            </div>
            <p className="field-note">
              iPadでは画像を長押しして保存することもできます。画像には選択期間の数値と日記の一言が含まれます。
            </p>
          </section>
        </div>
      )}
    </>
  );
}
