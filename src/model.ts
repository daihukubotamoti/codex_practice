export type SetEntry = { weight: number; reps: number };
export type Exercise = { id: string; name: string };
export type Entry = {
  id: string;
  date: string;
  exerciseId: string;
  name: string;
  sets: SetEntry[];
  createdAt: string;
  minutes?: number;
};
export type Journal = {
  date: string;
  effort: string;
  mood: string;
  message: string;
  photo?: string;
};
export type Goal = {
  id: string;
  title: string;
  kind: "weight" | "weekly" | "personal";
  target: number;
  exerciseId?: string;
  done: boolean;
};
export type Letter = {
  id: string;
  text: string;
  unlockDate: string;
  createdAt: string;
};
export type State = {
  version: 2;
  revision: number;
  exercises: Exercise[];
  entries: Entry[];
  rests: string[];
  settings: { name: string };
  journals: Journal[];
  goals: Goal[];
  letters: Letter[];
};
export const initialState: State = {
  version: 2,
  revision: 0,
  exercises: [],
  entries: [],
  rests: [],
  settings: { name: "YOU" },
  journals: [],
  goals: [],
  letters: [],
};
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const dateOK = (x: unknown): x is string =>
  typeof x === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(x) &&
  localDate(new Date(x + "T12:00:00")) === x;
export const chapters = [
  { level: 1, name: "BEGINNING" },
  { level: 4, name: "IN MOTION" },
  { level: 8, name: "CONSISTENCY" },
  { level: 15, name: "EVOLUTION" },
  { level: 25, name: "BECOMING" },
];
export function isPB(entry: Entry, all: Entry[]) {
  const score = Math.max(...entry.sets.map((x) => x.weight * x.reps), 0);
  return (
    score > 0 &&
    !all.some(
      (e) =>
        e.id !== entry.id &&
        e.exerciseId === entry.exerciseId &&
        (e.createdAt < entry.createdAt ||
          (e.createdAt === entry.createdAt && e.id < entry.id)) &&
        Math.max(...e.sets.map((x) => x.weight * x.reps), 0) >= score,
    )
  );
}
export function growth(s: Pick<State, "entries">) {
  const xp = s.entries.reduce(
      (n, e) => n + e.sets.length * 10 + (isPB(e, s.entries) ? 20 : 0),
      0,
    ),
    level = 1 + Math.floor(xp / 100);
  const chapter = chapters.reduce((n, c, i) => (level >= c.level ? i : n), 0),
    next = chapters[chapter + 1];
  const chapterStart = (chapters[chapter].level - 1) * 100,
    chapterEnd = next ? (next.level - 1) * 100 : xp;
  return {
    xp,
    level,
    progress: xp % 100,
    chapter,
    rank: chapters[chapter].name,
    next,
    remaining: next ? chapterEnd - xp : 0,
    chapterProgress: next
      ? (xp - chapterStart) / (chapterEnd - chapterStart)
      : 1,
  };
}
export function weekDates(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return localDate(d);
  });
}
export function monthBefore(date: string, n: number) {
  const d = new Date(date + "T12:00:00"),
    day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  d.setDate(
    Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()),
  );
  return localDate(d);
}
export const uniqueDays = (entries: Entry[]) =>
  new Set(entries.map((e) => e.date)).size;
export const maxWeight = (entries: Entry[]) =>
  entries.reduce(
    (best, entry) =>
      entry.sets.reduce((value, set) => Math.max(value, set.weight), best),
    0,
  );
export function bestStreak(entries: Entry[]) {
  const days = [...new Set(entries.map((e) => e.date))].sort();
  let best = 0,
    run = 0,
    last = "";
  for (const day of days) {
    const d = new Date(day + "T12:00:00");
    d.setDate(d.getDate() - 1);
    run = localDate(d) === last ? run + 1 : 1;
    last = day;
    best = Math.max(best, run);
  }
  return best;
}
export function summary(state: State, prefix: string) {
  const entries = state.entries.filter((e) => e.date.startsWith(prefix));
  return {
    entries,
    days: uniqueDays(entries),
    records: entries.length,
    sets: entries.reduce((n, e) => n + e.sets.length, 0),
    minutes: entries.some((e) => e.minutes !== undefined)
      ? entries.reduce((n, e) => n + (e.minutes ?? 0), 0)
      : null,
    pbs: entries.filter((e) => isPB(e, state.entries)).length,
    streak: bestStreak(entries),
    journals: state.journals.filter((j) => j.date.startsWith(prefix)),
  };
}
export function goalProgress(goal: Goal, s: State, today = localDate()) {
  if (goal.kind === "personal") return goal.done ? 1 : 0;
  if (goal.kind === "weekly")
    return (
      uniqueDays(
        s.entries.filter((e) =>
          weekDates(new Date(today + "T12:00:00")).includes(e.date),
        ),
      ) / goal.target
    );
  return (
    maxWeight(s.entries.filter((e) => e.exerciseId === goal.exerciseId)) /
    goal.target
  );
}
export function milestones(s: State) {
  const chronological = [...s.entries].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
  );
  const dates = [...new Set(chronological.map((e) => e.date))];
  return [
    {
      title: "THE FIRST PAGE",
      description: "はじめてのトレーニング",
      date: dates[0],
    },
    {
      title: "TEN DAYS OF YOU",
      description: "トレーニングした日が10日に",
      date: dates[9],
    },
    {
      title: "A NEW PERSONAL BEST",
      description: "はじめての自己ベスト",
      date: chronological.find((e) => isPB(e, s.entries))?.date,
    },
    {
      title: "ONE HUNDRED SETS",
      description: "100セットの積み重ね",
      date: (() => {
        let count = 0;
        return chronological.find((e) => (count += e.sets.length) >= 100)?.date;
      })(),
    },
    {
      title: "THE QUIET DAYS",
      description: "休息も、アーカイブの一部",
      date: [...s.rests].sort()[0],
    },
    {
      title: "WORDS TO REMEMBER",
      description: "はじめての日記",
      date: [...s.journals].sort((a, b) => a.date.localeCompare(b.date))[0]
        ?.date,
    },
  ];
}
function ensure(ok: unknown, message: string): asserts ok {
  if (!ok) throw Error(message);
}
const text = (x: unknown, max: number) =>
  typeof x === "string" && x.length <= max;
export function parseBackup(raw: string): State {
  const s = JSON.parse(raw);
  ensure(
    s &&
      (s.version === 1 || s.version === 2) &&
      Array.isArray(s.exercises) &&
      Array.isArray(s.entries) &&
      Array.isArray(s.rests) &&
      s.settings &&
      text(s.settings.name, 100),
    "対応するバックアップではありません。",
  );
  const ids = new Set<string>();
  for (const e of s.exercises) {
    ensure(
      e &&
        text(e.id, 200) &&
        e.id &&
        !ids.has(e.id) &&
        text(e.name, 60) &&
        e.name.trim(),
      "種目データが不正です。",
    );
    ids.add(e.id);
  }
  const entryIds = new Set<string>();
  for (const e of s.entries) {
    ensure(
      e &&
        text(e.id, 200) &&
        e.id &&
        !entryIds.has(e.id) &&
        text(e.name, 60) &&
        e.name.trim() &&
        ids.has(e.exerciseId) &&
        dateOK(e.date) &&
        typeof e.createdAt === "string" &&
        Number.isFinite(Date.parse(e.createdAt)) &&
        Array.isArray(e.sets) &&
        e.sets.length > 0 &&
        e.sets.length <= 100 &&
        e.sets.every(
          (x: SetEntry) =>
            x &&
            Number.isFinite(x.weight) &&
            x.weight >= 0 &&
            x.weight <= 2000 &&
            Number.isInteger(x.reps) &&
            x.reps >= 1 &&
            x.reps <= 10000,
        ) &&
        (e.minutes === undefined ||
          (Number.isInteger(e.minutes) && e.minutes >= 0 && e.minutes <= 1440)),
      "記録データが不正です。",
    );
    entryIds.add(e.id);
  }
  ensure(s.rests.every(dateOK), "休息日データが不正です。");
  if (s.version === 1)
    return {
      ...structuredClone(initialState),
      exercises: s.exercises,
      entries: s.entries,
      rests: s.rests,
      settings: { name: s.settings.name },
    };
  ensure(
    Array.isArray(s.journals) &&
      Array.isArray(s.goals) &&
      Array.isArray(s.letters) &&
      Number.isInteger(s.revision) &&
      s.revision >= 0,
    "追加データが不正です。",
  );
  const journalDates = new Set();
  for (const j of s.journals) {
    ensure(
      j &&
        dateOK(j.date) &&
        !journalDates.has(j.date) &&
        text(j.effort, 2000) &&
        text(j.message, 1000) &&
        ["calm", "good", "tired", "focused", "mixed"].includes(j.mood) &&
        (j.photo === undefined ||
          (typeof j.photo === "string" &&
            j.photo.length <= 1_500_000 &&
            /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(j.photo))),
      "日記データが不正です。",
    );
    journalDates.add(j.date);
  }
  const goalIds = new Set();
  for (const g of s.goals) {
    ensure(
      g &&
        text(g.id, 200) &&
        g.id &&
        !goalIds.has(g.id) &&
        text(g.title, 100) &&
        g.title.trim() &&
        ["weight", "weekly", "personal"].includes(g.kind) &&
        Number.isFinite(g.target) &&
        g.target > 0 &&
        g.target <=
          (g.kind === "weight" ? 2000 : g.kind === "weekly" ? 7 : 10000) &&
        typeof g.done === "boolean" &&
        (g.kind !== "weight" || ids.has(g.exerciseId)),
      "目標データが不正です。",
    );
    goalIds.add(g.id);
  }
  const letterIds = new Set();
  for (const l of s.letters) {
    ensure(
      l &&
        text(l.id, 200) &&
        l.id &&
        !letterIds.has(l.id) &&
        text(l.text, 3000) &&
        l.text.trim() &&
        dateOK(l.unlockDate) &&
        typeof l.createdAt === "string" &&
        Number.isFinite(Date.parse(l.createdAt)),
      "手紙データが不正です。",
    );
    letterIds.add(l.id);
  }
  return {
    version: 2,
    revision: s.revision,
    exercises: s.exercises,
    entries: s.entries,
    rests: s.rests,
    settings: { name: s.settings.name },
    journals: s.journals,
    goals: s.goals,
    letters: s.letters,
  };
}
