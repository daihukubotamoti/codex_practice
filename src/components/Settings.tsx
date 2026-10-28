import { useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { legacyBackup, readDraft, writeDraft } from "../db";
import { jsonDownload } from "../media";
import { parseBackup, type State } from "../model";
import { SectionHead, Title, type Persist } from "./shared";
export default function Settings({
  state,
  today,
  persist,
  busy,
  restored,
  notify,
}: {
  state: State;
  today: string;
  persist: Persist;
  busy: boolean;
  restored: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const file = useRef<HTMLInputElement>(null),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(""),
    [name, setName] = useState("");
  async function restore(input?: File) {
    if (!input) return;
    setError("");
    try {
      if (input.size > 50 * 1024 * 1024)
        throw Error("50MB以下のJSONを選んでください。");
      const next = parseBackup(await input.text());
      if (
        !confirm(
          `現在の全データを、${next.entries.length}件のトレーニングと${next.journals.length}件の日記で置き換えます。復元前の控えも端末内に残します。復元しますか？`,
        )
      )
        return;
      await writeDraft("pre-restore-backup", state);
      if (
        await persist(
          { ...next, revision: state.revision },
          "バックアップから復元しました。",
        )
      )
        await restored();
    } catch (e) {
      setError(e instanceof Error ? e.message : "復元できませんでした。");
    } finally {
      if (file.current) file.current.value = "";
    }
  }
  return (
    <>
      <Title
        index="06"
        title="Keep what matters."
        japanese="設定とデータ"
        description="あなたの記録は、あなたのもの。大切に持ち歩けるように。"
      />
      <div className="settings-grid">
        <section className="panel settings-panel">
          <SectionHead number="01" title="YOUR PROFILE" />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const value = new FormData(e.currentTarget)
                .get("name")
                ?.toString()
                .trim();
              if (value)
                await persist(
                  { ...state, settings: { name: value } },
                  "名前を更新しました。",
                );
            }}
            key={state.settings.name}
          >
            <label>
              表示名
              <input
                name="name"
                maxLength={100}
                defaultValue={state.settings.name}
                required
              />
            </label>
            <button className="button secondary" disabled={busy}>
              名前を保存
              <Check size={16} />
            </button>
          </form>
        </section>
        <section className="panel settings-panel">
          <SectionHead number="02" title="YOUR DATA, YOURS." />
          <p>
            記録は、この端末・このブラウザのIndexedDBに保存されます。外部サーバーへの送信や、端末間の自動同期はありません。
          </p>
          <p>
            写真を含む全データをJSONで保存できます。Safariのデータ削除や機種変更に備えて、定期的にバックアップを。
          </p>
          <div className="backup-actions">
            <button
              className="button primary"
              onClick={() => {
                jsonDownload(state, `becoming-${today}.json`);
                notify(
                  "バックアップを書き出しました。ファイルに保存してください。",
                );
              }}
            >
              <ArrowDownToLine size={17} />
              バックアップを書き出す
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => file.current?.click()}
            >
              <Upload size={17} />
              JSONから復元する
            </button>
          </div>
          <input
            type="file"
            accept="application/json,.json"
            hidden
            ref={file}
            onChange={(e) => restore(e.target.files?.[0])}
          />
          <p className="field-note">
            旧「こもれび鍛錬記」のJSONにも対応。復元は全データを置き換えます。写真・手紙も平文で含まれますので、公開しないでください。
          </p>
          <details className="recovery-details">
            <summary>移行前・復元前の控え</summary>
            <p>
              旧バージョンから初回移行した場合と、JSONを復元した場合には、直前の控えを端末内に残しています。
            </p>
            <button
              className="text-link"
              onClick={async () => {
                try {
                  const old = await legacyBackup();
                  if (old) jsonDownload(old, "komorebi-before-renewal.json");
                  else notify("旧バージョンからの移行前データはありません。");
                } catch {
                  setError("控えを読み込めませんでした。");
                }
              }}
            >
              リニューアル前の控えを書き出す
              <ArrowDownToLine size={14} />
            </button>
            <button
              className="text-link"
              onClick={async () => {
                try {
                  const old = await readDraft("pre-restore-backup");
                  if (old) jsonDownload(old, "becoming-before-restore.json");
                  else notify("JSON復元前の控えはありません。");
                } catch {
                  setError("控えを読み込めませんでした。");
                }
              }}
            >
              JSON復元前の控えを書き出す
              <ArrowDownToLine size={14} />
            </button>
          </details>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </section>
        <section className="panel settings-panel">
          <SectionHead number="03" title="YOUR MOVEMENTS" />
          <p>種目はトレーニング画面の自由入力で追加できます。</p>
          {state.exercises.length ? (
            state.exercises.map((ex) => (
              <div className="manage-row" key={ex.id}>
                {editing === ex.id ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const title = name.trim();
                      if (!title) return;
                      if (
                        state.exercises.some(
                          (x) => x.id !== ex.id && x.name === title,
                        )
                      ) {
                        notify("同じ名前の種目があります。");
                        return;
                      }
                      if (
                        await persist(
                          {
                            ...state,
                            exercises: state.exercises.map((x) =>
                              x.id === ex.id ? { ...x, name: title } : x,
                            ),
                            entries: state.entries.map((x) =>
                              x.exerciseId === ex.id
                                ? { ...x, name: title }
                                : x,
                            ),
                          },
                          "種目名を変更しました。",
                        )
                      )
                        setEditing("");
                    }}
                  >
                    <input
                      aria-label="新しい種目名"
                      value={name}
                      maxLength={60}
                      required
                      onChange={(e) => setName(e.target.value)}
                    />
                    <button
                      className="icon-button"
                      disabled={busy}
                      aria-label="種目名を保存"
                    >
                      <Check size={17} />
                    </button>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label="種目の編集を閉じる"
                      onClick={() => setEditing("")}
                    >
                      <X size={17} />
                    </button>
                  </form>
                ) : (
                  <>
                    <span>{ex.name}</span>
                    <button
                      className="icon-button"
                      aria-label={`${ex.name}の名前を変更`}
                      onClick={() => {
                        setEditing(ex.id);
                        setName(ex.name);
                      }}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="icon-button"
                      disabled={busy}
                      aria-label={`${ex.name}の種目を削除`}
                      onClick={() => {
                        const n = state.entries.filter(
                            (e) => e.exerciseId === ex.id,
                          ).length,
                          goals = state.goals.filter(
                            (g) => g.exerciseId === ex.id,
                          ).length;
                        if (
                          confirm(
                            `この種目と関連する${n}件の記録、${goals}件の重量目標を削除しますか？XPも再計算されます。`,
                          )
                        )
                          void persist(
                            {
                              ...state,
                              exercises: state.exercises.filter(
                                (x) => x.id !== ex.id,
                              ),
                              entries: state.entries.filter(
                                (x) => x.exerciseId !== ex.id,
                              ),
                              goals: state.goals.filter(
                                (g) => g.exerciseId !== ex.id,
                              ),
                            },
                            "種目を削除しました。",
                          );
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="field-note">
              トレーニングを記録すると、ここに種目が並びます。
            </p>
          )}
        </section>
        <section className="panel settings-panel">
          <SectionHead number="04" title="MAKE IT YOUR EVERYDAY" />
          <h3>ホーム画面から、あなたの記録へ。</h3>
          <ol>
            <li>Safariでこのアプリを開く</li>
            <li>共有メニューから「ホーム画面に追加」</li>
            <li>追加したアイコンから起動する</li>
          </ol>
          <p className="field-note">
            初回読み込み後はオフラインで利用可能。Safariとホーム画面アプリでは保存領域が異なる場合があります。移行時にはJSONバックアップを使い、普段は一つの場所・タブで記録してください。
          </p>
          <div className="settings-signature">
            BECOMING<em>.</em>
            <ArrowUpRight size={26} />
          </div>
          <span className="eyebrow">VERSION 2 / A PERSONAL GROWTH ARCHIVE</span>
        </section>
      </div>
    </>
  );
}
