import { useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Camera, Check, X } from "lucide-react";
import { dateOK, type Journal as JournalType, type State } from "../model";
import { preparePhoto } from "../media";
import { SectionHead, Title, type Persist } from "./shared";
export const moods = [
  { value: "calm", symbol: "◯", label: "穏やか" },
  { value: "good", symbol: "↗", label: "晴れやか" },
  { value: "focused", symbol: "◎", label: "集中" },
  { value: "tired", symbol: "☾", label: "おつかれ" },
  { value: "mixed", symbol: "≈", label: "いろいろ" },
];
export const blankJournal = (date: string): JournalType => ({
  date,
  effort: "",
  mood: "calm",
  message: "",
});
export default function Journal({
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
  draft: JournalType;
  onDraft: (d: JournalType) => void;
  persist: Persist;
  busy: boolean;
  onSaved: () => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [processing, setProcessing] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const patch = (p: Partial<JournalType>) => onDraft({ ...draft, ...p });
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!dateOK(draft.date) || draft.date > today) {
      setError("今日以前の正しい日付を選んでください。");
      return;
    }
    if (!draft.effort.trim() && !draft.message.trim() && !draft.photo) {
      setError("今日のことを一言、または写真を残してみてください。");
      return;
    }
    if (
      await persist(
        {
          ...state,
          journals: [
            ...state.journals.filter((j) => j.date !== draft.date),
            draft,
          ],
        },
        "今日のページを保存しました。",
      )
    )
      await onSaved();
  }
  return (
    <>
      <Title
        index="02"
        title="A day, in your words."
        japanese="パーソナルジャーナル"
        description="トレーニングのない日も、あなたの物語は続いている。"
      />
      <div className="journal-layout">
        <form className="panel journal-form" onSubmit={submit}>
          <SectionHead title="PERSONAL JOURNAL" />
          <fieldset className="journal-fields" disabled={processing || busy}>
            <label>
              記録する日
              <input
                type="date"
                value={draft.date}
                max={today}
                required
                onChange={(e) => {
                  const date = e.target.value;
                  if (
                    (draft.effort || draft.message || draft.photo) &&
                    !confirm(
                      "日付を切り替えると入力中の日記が置き換わります。切り替えますか？",
                    )
                  )
                    return;
                  onDraft(
                    state.journals.find((j) => j.date === date) ??
                      blankJournal(date),
                  );
                }}
              />
            </label>
            <fieldset className="mood-field">
              <legend>今日の気分</legend>
              <div className="moods">
                {moods.map((m) => (
                  <button
                    type="button"
                    key={m.value}
                    aria-pressed={draft.mood === m.value}
                    className={draft.mood === m.value ? "selected" : ""}
                    onClick={() => patch({ mood: m.value })}
                  >
                    <strong>{m.symbol}</strong>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <label>
              今日頑張ったこと
              <textarea
                maxLength={2000}
                rows={4}
                placeholder="小さなことでも、ひとつ。"
                value={draft.effort}
                onChange={(e) => patch({ effort: e.target.value })}
              />
            </label>
            <label>
              今日の自分に一言
              <textarea
                maxLength={1000}
                rows={3}
                placeholder="今の自分に、残しておきたい言葉。"
                value={draft.message}
                onChange={(e) => patch({ message: e.target.value })}
              />
            </label>
            <div className="photo-field">
              <span className="field-title">
                ONE FRAME <span>写真1枚・任意</span>
              </span>
              {draft.photo ? (
                <div className="photo-preview">
                  <img src={draft.photo} alt="日記に添付する写真" />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="日記の写真を外す"
                    onClick={() => patch({ photo: undefined })}
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button
                  className="photo-picker"
                  type="button"
                  disabled={processing}
                  onClick={() => photoInput.current?.click()}
                >
                  <Camera size={25} />
                  <span>
                    {processing ? "写真を整えています…" : "今日の一枚を選ぶ"}
                  </span>
                  <small>JPEG / PNG / WebP・最大20MB</small>
                </button>
              )}
              <input
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp"
                ref={photoInput}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setProcessing(true);
                  try {
                    patch({ photo: await preparePhoto(file) });
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "写真を保存できませんでした。",
                    );
                  } finally {
                    setProcessing(false);
                    e.target.value = "";
                  }
                }}
              />
              <p className="field-note">
                写真は最大1440pxのJPEGに圧縮し、端末内だけに保存します。
              </p>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button primary wide"
              disabled={busy || processing}
            >
              この一日を保存
              <Check size={18} />
            </button>
            <p className="field-note">
              同じ日付の日記は更新されます。日記にXPは付与しません。
            </p>
          </fieldset>
        </form>
        <aside className="journal-aside">
          <div className="journal-quote">
            <span className="eyebrow">NOT EVERY DAY NEEDS A RECORD.</span>
            <blockquote>
              Some days,
              <br />
              just being
              <br />
              is enough.
            </blockquote>
            <p>
              何かを成し遂げた日も、
              <br />
              ただ、ゆっくり過ごした日も。
            </p>
            <ArrowUpRight size={29} />
          </div>
          <SectionHead title="RECENT PAGES" />
          {[...state.journals]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 3)
            .map((j) => (
              <button
                className="journal-snippet"
                key={j.date}
                onClick={() => {
                  if (
                    (draft.effort || draft.message || draft.photo) &&
                    !confirm("入力中の日記を置き換えて、この日記を開きますか？")
                  )
                    return;
                  onDraft(j);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <span>
                  {j.date.replaceAll("-", ".")} /{" "}
                  {moods.find((m) => m.value === j.mood)?.label}
                </span>
                <p>{j.message || j.effort || "ONE FRAME"}</p>
                <ArrowUpRight size={17} />
              </button>
            ))}
        </aside>
      </div>
    </>
  );
}
