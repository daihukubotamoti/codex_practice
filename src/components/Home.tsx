import { ArrowDown, ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import {
  growth,
  isPB,
  localDate,
  maxWeight,
  summary,
  uniqueDays,
  weekDates,
  type Entry,
  type State,
} from "../model";
import {
  Empty,
  EntryList,
  Progress,
  SectionHead,
  Stat,
  TextLink,
  pad,
  type Persist,
} from "./shared";
export default function Home({
  state,
  today,
  navigate,
  start,
  edit,
  persist,
  busy,
}: {
  state: State;
  today: string;
  navigate: (s: string) => void;
  start: () => void;
  edit: (e: Entry) => void;
  persist: Persist;
  busy: boolean;
}) {
  const g = growth(state),
    month = summary(state, today.slice(0, 7)),
    total = uniqueDays(state.entries),
    week = weekDates(new Date(today + "T12:00:00"));
  const latest = [...state.entries]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, 3);
  const bests = state.exercises
    .map((ex) => ({
      name: ex.name,
      id: ex.id,
      weight: maxWeight(state.entries.filter((e) => e.exerciseId === ex.id)),
      pbs: state.entries.filter(
        (e) => e.exerciseId === ex.id && isPB(e, state.entries),
      ).length,
    }))
    .filter((b) => b.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);
  const date = new Date(today + "T12:00:00");
  return (
    <>
      <div className="home-dateline">
        <span>YOUR PERSONAL GROWTH ARCHIVE</span>
        <span>
          {new Intl.DateTimeFormat("en-US", {
            month: "long",
            day: "2-digit",
            year: "numeric",
          })
            .format(date)
            .toUpperCase()}{" "}
          <i> / </i>
          {new Intl.DateTimeFormat("en-US", { weekday: "long" })
            .format(date)
            .toUpperCase()}
        </span>
      </div>
      <section className="cover">
        <div className="cover-copy">
          <div className="cover-overline">
            <span className="short-rule" /> THE ART OF SHOWING UP
          </div>
          <h1>
            Not there yet.
            <br />
            <em>Still becoming.</em>
          </h1>
          <p>
            昨日の自分を、今日の自分が超えていく。
            <br />
            小さな積み重ねを、あなたの物語に。
          </p>
          <button className="button primary" onClick={start}>
            今日の記録をはじめる
            <ArrowUpRight size={19} />
          </button>
          <div className="cover-footnote">
            <span>VOL. {pad(g.chapter + 1)}</span>
            <span>ONE DAY. ONE PAGE. ONE STEP.</span>
            <ArrowDown size={14} />
          </div>
        </div>
        <div
          className="cover-art"
          role="img"
          aria-label="柔らかな光と影が差し込む、モノクロの抽象的な建築空間"
        >
          <div className="art-topline">
            <span>A STUDY IN PROGRESS</span>
            <span>FIG. 01</span>
          </div>
          <div className="art-quote">
            The only way
            <br />
            is <em>through.</em>
          </div>
          <div className="art-bottom">
            <span>LIGHT / TIME / CHANGE</span>
            <span>↗</span>
          </div>
        </div>
      </section>
      <section className="chapter-strip">
        <div className="chapter-caption">
          <span className="eyebrow">THE CHAPTER YOU’RE IN</span>
          <h2>
            <span>0{g.chapter + 1}</span>
            {g.rank}
          </h2>
        </div>
        <div className="chapter-level">
          <span className="eyebrow">CURRENT LEVEL</span>
          <strong>{pad(g.level)}</strong>
          <span>{g.xp.toLocaleString()} XP</span>
        </div>
        <div className="chapter-progress">
          <div>
            <span>
              {g.next ? `NEXT / ${g.next.name}` : "YOUR STORY CONTINUES"}
            </span>
            <span>{g.next ? `${g.remaining} XP TO GO` : "CHAPTER 05"}</span>
          </div>
          <Progress value={g.chapterProgress} label="次のランクまでの進捗" />
          <small>
            {g.next
              ? `Lv.${g.next.level} で次の章へ。焦らず、あなたのペースで。`
              : "ここまでの歩みも、これからの変化も。"}
          </small>
        </div>
      </section>
      <div className="home-stats">
        <Stat
          label="DAYS YOU SHOWED UP"
          value={pad(total)}
          unit="DAYS"
          note="累計トレーニング日数"
        />
        <Stat
          label="THIS MONTH’S SESSIONS"
          value={pad(month.days)}
          unit="DAYS"
          note={`${date.getMonth() + 1}月のトレーニング日数 · ${month.records}種目記録`}
        />
        <Stat
          label="PERSONAL BEST MOMENTS"
          value={pad(
            state.entries.filter((e) => isPB(e, state.entries)).length,
          )}
          unit="TIMES"
          note="積み重ねた自己ベスト更新"
        />
      </div>
      <div className="home-lower">
        <section className="home-week">
          <SectionHead number="01" title="A WEEK OF YOU">
            <TextLink onClick={() => navigate("archive")}>アーカイブ</TextLink>
          </SectionHead>
          <div className="week-strip">
            {week.map((d, i) => {
              const trained = state.entries.some((e) => e.date === d),
                rest = state.rests.includes(d),
                journal = state.journals.some((j) => j.date === d);
              return (
                <div
                  key={d}
                  className={`${d === today ? "today" : ""} ${trained ? "trained" : ""}`}
                >
                  <span>{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
                  <strong>{d.slice(8)}</strong>
                  <span className="week-marker">
                    {trained ? "●" : rest ? "—" : journal ? "○" : "·"}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="week-note">
            <span>● TRAINING　 ○ JOURNAL　 — REST</span>
            <span>EVERY DAY COUNTS.</span>
          </div>
        </section>
        <section className="home-bests">
          <SectionHead number="02" title="PERSONAL BESTS">
            <TextLink onClick={() => navigate("progress")}>成長を見る</TextLink>
          </SectionHead>
          {bests.length ? (
            bests.map((b, i) => (
              <div className="best-row" key={b.id}>
                <span>0{i + 1}</span>
                <h3>{b.name}</h3>
                <strong>
                  {b.weight}
                  <small>kg</small>
                </strong>
                <ArrowUpRight size={18} />
              </div>
            ))
          ) : (
            <Empty title="Your next best is ahead.">
              最初のトレーニングから、記録が育っていきます。
            </Empty>
          )}
        </section>
      </div>
      <section className="journal-invite">
        <div>
          <span className="eyebrow">BEYOND THE NUMBERS</span>
          <h2>
            How was <em>your day?</em>
          </h2>
          <p>数字には残らない、今日のあなたも。</p>
        </div>
        <button
          className="round-link"
          onClick={() => navigate("journal")}
          aria-label="日記を書く"
        >
          <Plus size={30} />
        </button>
      </section>
      <section className="recent-section">
        <SectionHead number="03" title="THE RECENT WORK">
          <TextLink onClick={() => navigate("archive")}>すべての記録</TextLink>
        </SectionHead>
        <EntryList
          entries={latest}
          state={state}
          busy={busy}
          edit={edit}
          persist={persist}
        />
      </section>
      <section className="rest-line">
        <span>REST IS PART OF THE PROCESS.</span>
        <p>何もしない日も、必要な一日。</p>
        <button
          disabled={busy}
          onClick={async () => {
            if (state.entries.some((e) => e.date === today)) {
              alert(
                "今日はトレーニングを記録済みです。記録後の時間も、ゆっくり休んでください。",
              );
              return;
            }
            if (state.rests.includes(today)) return;
            await persist(
              { ...state, rests: [...state.rests, localDate(date)] },
              "今日は休息日として残しました。",
            );
          }}
        >
          {state.rests.includes(today)
            ? "休息日として記録済み"
            : "今日を休息日として残す"}
          <ArrowRight size={15} />
        </button>
      </section>
    </>
  );
}
