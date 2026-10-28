import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Menu,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { load, readDraft, save, writeDraft } from "./db";
import {
  growth,
  initialState,
  localDate,
  type Entry,
  type Journal as JournalType,
  type State,
} from "./model";
import Home from "./components/Home";
import Training, {
  blankTraining,
  entryDraft,
  type TrainingDraft,
} from "./components/Training";
import Journal, { blankJournal } from "./components/Journal";
import Archive from "./components/Archive";
import Growth from "./components/Growth";
import Review from "./components/Review";
import Settings from "./components/Settings";
const navigation = [
  { id: "home", name: "Overview", jp: "ホーム" },
  { id: "training", name: "Training", jp: "トレーニング" },
  { id: "journal", name: "Journal", jp: "日記" },
  { id: "archive", name: "Archive", jp: "アーカイブ" },
  { id: "progress", name: "Growth", jp: "成長" },
  { id: "review", name: "Review", jp: "振り返り" },
];
export default function App() {
  const [state, setState] = useState<State>(initialState),
    [ready, setReady] = useState(false),
    [tab, setTab] = useState("home"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [menu, setMenu] = useState(false),
    [today, setToday] = useState(localDate()),
    [chapter, setChapter] = useState<number | null>(null);
  const [training, setTraining] = useState<TrainingDraft>(
      blankTraining(localDate()),
    ),
    [journal, setJournal] = useState<JournalType>(blankJournal(localDate()));
  const saving = useRef(false),
    latest = useRef(state),
    draftQueue = useRef(Promise.resolve());
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    let live = true;
    Promise.all([
      load(),
      readDraft<TrainingDraft>("training"),
      readDraft<JournalType>("journal"),
    ])
      .then(([s, t, j]) => {
        if (!live) return;
        latest.current = s;
        setState(s);
        if (t) setTraining(t);
        setJournal(
          j ??
            s.journals.find((page) => page.date === localDate()) ??
            blankJournal(localDate()),
        );
        setReady(true);
      })
      .catch((e) =>
        setError(
          `記録を開けませんでした。データは初期化していません。${e instanceof Error ? e.message : ""} Safariの通常タブで再読み込みしてください。`,
        ),
      );
    const timer = setInterval(() => setToday(localDate()), 30000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (chapter === null) return;
    const t = setTimeout(() => setChapter(null), 5500);
    return () => clearTimeout(t);
  }, [chapter]);
  function navigate(next: string) {
    setTab(next);
    setMenu(false);
    window.scrollTo({
      top: 0,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  function draftWrite(key: string, value: unknown) {
    const task = draftQueue.current.then(() => writeDraft(key, value));
    draftQueue.current = task.catch(() => {
      setError(
        "下書きを端末に保存できませんでした。入力は画面に残っています。容量を確認して、正式に保存するか内容を控えてください。",
      );
    });
    return task;
  }
  function trainingDraft(d: TrainingDraft) {
    setTraining(d);
    void draftWrite("training", d).catch(() => {});
  }
  function journalDraft(d: JournalType) {
    setJournal(d);
    void draftWrite("journal", d).catch(() => {});
  }
  async function persist(next: State, message: string) {
    if (!ready || saving.current) return false;
    saving.current = true;
    setBusy(true);
    try {
      const before = growth(latest.current).chapter;
      const saved = await save(next);
      latest.current = saved;
      setState(saved);
      setError("");
      setToast(message);
      const after = growth(saved).chapter;
      if (after > before) setChapter(after);
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "保存できませんでした。空き容量を確認してください。入力内容は残っています。",
      );
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function start(date = today) {
    if (
      training.name ||
      training.editing ||
      training.sets.some((s) => s.weight || s.reps)
    ) {
      navigate("training");
      setToast(
        "保存していた下書きを開きました。新しく始める場合は「入力をクリア」を選べます。",
      );
      return;
    }
    trainingDraft(blankTraining(date));
    navigate("training");
  }
  function edit(e: Entry) {
    if (
      (training.name || training.editing) &&
      !confirm("入力途中の下書きを、この記録の編集内容に置き換えますか？")
    )
      return;
    trainingDraft(entryDraft(e));
    navigate("training");
  }
  function openJournal(date: string) {
    if (
      (journal.effort || journal.message || journal.photo) &&
      !confirm("入力途中の日記を、選択日の内容に置き換えますか？")
    )
      return;
    journalDraft(
      state.journals.find((j) => j.date === date) ?? blankJournal(date),
    );
    navigate("journal");
  }
  async function clearDrafts() {
    await draftWrite("training", undefined);
    await draftWrite("journal", undefined);
    setTraining(blankTraining(today));
    setJournal(
      latest.current.journals.find((page) => page.date === today) ??
        blankJournal(today),
    );
  }
  return (
    <div className="app">
      <a href="#main" className="skip-link">
        本文へ移動
      </a>
      <header className="site-header">
        <a
          href="#"
          className="wordmark"
          aria-label="BECOMING. ホーム"
          onClick={(e) => {
            e.preventDefault();
            navigate("home");
          }}
        >
          BECOMING<span>.</span>
        </a>
        <nav className={menu ? "open" : ""} aria-label="メインメニュー">
          {navigation.map((n) => (
            <button
              key={n.id}
              aria-current={tab === n.id ? "page" : undefined}
              className={tab === n.id ? "active" : ""}
              onClick={() => navigate(n.id)}
              aria-label={n.jp}
            >
              {n.name}
              <span>{n.jp}</span>
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <span className="local-label">
            <i />
            LOCAL & PRIVATE
          </span>
          <button
            className={`icon-button ${tab === "settings" ? "active" : ""}`}
            aria-label="設定・バックアップ"
            onClick={() => navigate("settings")}
          >
            <SettingsIcon size={19} />
          </button>
          <button
            className="icon-button menu-toggle"
            aria-label="メニューを開閉"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {error && (
          <div className="alert" role="alert">
            <p>{error}</p>
            <button
              className="icon-button"
              aria-label="エラーを閉じる"
              onClick={() => setError("")}
            >
              <X size={18} />
            </button>
          </div>
        )}
        {needRefresh && (
          <div className="update-banner">
            <p>新しいバージョンを読み込めます。下書きは端末に残ります。</p>
            <button
              className="text-link"
              disabled={busy}
              onClick={async () => {
                try {
                  await draftQueue.current;
                  await writeDraft("training", training);
                  await writeDraft("journal", journal);
                  await updateServiceWorker(true);
                } catch {
                  setError("下書きを保存できなかったため更新を中止しました。");
                }
              }}
            >
              更新する
              <ArrowUpRight size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="更新案内を閉じる"
              onClick={() => setNeedRefresh(false)}
            >
              <X size={17} />
            </button>
          </div>
        )}
        {!ready ? (
          <div className="loading">
            <span>B.</span>
            <p>YOUR ARCHIVE IS OPENING.</p>
            {error && <p>元の記録は保持されています。</p>}
          </div>
        ) : (
          <div className="page-content" key={tab}>
            {tab === "home" && (
              <Home
                state={state}
                today={today}
                navigate={navigate}
                start={() => start()}
                edit={edit}
                persist={persist}
                busy={busy}
              />
            )}{" "}
            {tab === "training" && (
              <Training
                state={state}
                today={today}
                draft={training}
                onDraft={trainingDraft}
                persist={persist}
                busy={busy}
                onSaved={async () => {
                  try {
                    await draftWrite("training", undefined);
                    setTraining(blankTraining(today));
                    navigate("home");
                  } catch {
                    setError(
                      "記録は保存済みですが下書きを消せませんでした。再保存するときは重複にご注意ください。",
                    );
                  }
                }}
              />
            )}
            {tab === "journal" && (
              <Journal
                state={state}
                today={today}
                draft={journal}
                onDraft={journalDraft}
                persist={persist}
                busy={busy}
                onSaved={async () => {
                  try {
                    await draftWrite("journal", undefined);
                    setJournal(
                      latest.current.journals.find(
                        (page) => page.date === journal.date,
                      ) ?? blankJournal(today),
                    );
                    navigate("archive");
                  } catch {
                    setError("日記は保存済みですが下書きを消せませんでした。");
                  }
                }}
              />
            )}
            {tab === "archive" && (
              <Archive
                state={state}
                today={today}
                edit={edit}
                start={start}
                journal={openJournal}
                persist={persist}
                busy={busy}
              />
            )}{" "}
            {tab === "progress" && (
              <Growth
                state={state}
                today={today}
                persist={persist}
                busy={busy}
              />
            )}{" "}
            {tab === "review" && <Review state={state} today={today} />}{" "}
            {tab === "settings" && (
              <Settings
                state={state}
                today={today}
                persist={persist}
                busy={busy}
                notify={setToast}
                restored={clearDrafts}
              />
            )}
          </div>
        )}
        <footer className="site-footer">
          <div>
            BECOMING<span>.</span>
            <p>A PERSONAL GROWTH ARCHIVE</p>
          </div>
          <span>EVERY SMALL EFFORT IS A PART OF YOU.</span>
          <span>KEEP GOING, AT YOUR OWN PACE. ↗</span>
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="通知を閉じる"
            onClick={() => setToast("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {chapter !== null && (
        <div className="chapter-announcement" role="status">
          <button
            className="icon-button"
            aria-label="新しい章の案内を閉じる"
            onClick={() => setChapter(null)}
          >
            <X size={21} />
          </button>
          <span>YOUR NEXT CHAPTER</span>
          <strong>0{chapter + 1}</strong>
          <h2>
            {growth(state).rank}
            <em>.</em>
          </h2>
          <p>ここまでの一歩が、新しいあなたになった。</p>
        </div>
      )}
    </div>
  );
}
