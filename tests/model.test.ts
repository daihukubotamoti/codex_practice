import { describe, it, expect } from "vitest";
import {
  bestStreak,
  goalProgress,
  growth,
  initialState,
  maxWeight,
  milestones,
  monthBefore,
  parseBackup,
  summary,
  weekDates,
  type State,
} from "../src/model";
const legacy = {
  version: 1,
  exercises: [{ id: "squat", name: "スクワット" }],
  entries: [
    {
      id: "1",
      date: "2026-10-26",
      exerciseId: "squat",
      name: "スクワット",
      sets: [
        { weight: 20, reps: 10 },
        { weight: 25, reps: 8 },
      ],
      createdAt: "2026-10-26T10:00:00Z",
    },
  ],
  rests: ["2026-10-25"],
  settings: { name: "旅人", sound: false },
};
const state: State = parseBackup(JSON.stringify(legacy));
describe("legacy migration and progression", () => {
  it("preserves every legacy record and original XP", () => {
    expect(state.version).toBe(2);
    expect(state.entries).toEqual(legacy.entries);
    expect(state.exercises).toEqual(legacy.exercises);
    expect(state.rests).toEqual(legacy.rests);
    expect(state.settings.name).toBe("旅人");
    expect(growth(state).xp).toBe(40);
    expect(state.journals).toEqual([]);
    expect(legacy.version).toBe(1);
  });
  it("rewards a repeated equal PB only once", () => {
    expect(
      growth({
        ...state,
        entries: [
          ...state.entries,
          { ...state.entries[0], id: "2", createdAt: "2026-10-27T10:00:00Z" },
        ],
      }).xp,
    ).toBe(60);
  });
  it("retains level 4/8/15 boundaries and adds chapter 5 at level25", () => {
    for (const [sets, chapter, level] of [
      [28, 1, 4],
      [68, 2, 8],
      [138, 3, 15],
      [238, 4, 25],
    ]) {
      const s = {
        ...state,
        entries: [
          {
            ...state.entries[0],
            sets: Array.from({ length: sets }, () => ({
              weight: 20,
              reps: 10,
            })),
          },
        ],
      };
      expect(growth(s).chapter).toBe(chapter);
      expect(growth(s).level).toBe(level);
    }
  });
  it("does not award XP for journal spam, goals, rest or letters", () => {
    const s = {
      ...state,
      rests: ["2026-10-27"],
      journals: [
        { date: "2026-10-27", effort: "rest", mood: "calm", message: "well" },
      ],
      letters: [
        {
          id: "letter",
          text: "hello",
          unlockDate: "2027-01-01",
          createdAt: "2026-10-27T00:00:00Z",
        },
      ],
    };
    expect(growth(s)).toEqual(growth(state));
  });
  it("keeps the final chapter open and never divides by zero", () => {
    const s = {
      ...state,
      entries: [
        {
          ...state.entries[0],
          sets: Array.from({ length: 250 }, () => ({ weight: 20, reps: 10 })),
        },
      ],
    };
    expect(growth(s).chapterProgress).toBe(1);
    expect(growth(s).next).toBeUndefined();
  });
});
describe("backup validation", () => {
  it("round-trips all new fields and compressed photo", () => {
    const all = {
      ...state,
      journals: [
        {
          date: "2026-10-27",
          effort: "did my best",
          mood: "good",
          message: "keep going",
          photo: "data:image/jpeg;base64,/9j/AA==",
        },
      ],
      goals: [
        {
          id: "g",
          title: "60kg",
          kind: "weight",
          exerciseId: "squat",
          target: 60,
          done: false,
        },
      ],
      letters: [
        {
          id: "l",
          text: "hi",
          unlockDate: "2027-01-01",
          createdAt: "2026-10-27T00:00:00Z",
        },
      ],
    };
    expect(parseBackup(JSON.stringify(all))).toEqual(all);
  });
  it("rejects incompatible versions, invalid numbers, dates, duplicates and orphaned entries", () => {
    for (const bad of [
      { ...state, version: 3 },
      { ...state, entries: [{ ...state.entries[0], exerciseId: "missing" }] },
      {
        ...state,
        entries: [{ ...state.entries[0], sets: [{ weight: -1, reps: 10 }] }],
      },
      { ...state, rests: ["2026-02-31"] },
      { ...state, entries: [...state.entries, ...state.entries] },
      { ...state, entries: [{ ...state.entries[0], minutes: -1 }] },
      { ...state, revision: -1 },
    ])
      expect(() => parseBackup(JSON.stringify(bad))).toThrow();
  });
  it("rejects untrusted image URLs, duplicate journals and invalid goals and letters", () => {
    for (const bad of [
      {
        ...state,
        journals: [
          {
            date: "2026-10-27",
            effort: "",
            message: "",
            mood: "good",
            photo: "https://tracker.example/photo.jpg",
          },
        ],
      },
      {
        ...state,
        goals: [
          {
            id: "g",
            title: "bad",
            kind: "weight",
            target: 1,
            exerciseId: "missing",
            done: false,
          },
        ],
      },
      {
        ...state,
        letters: [{ id: "l", text: "hi", unlockDate: "no", createdAt: "no" }],
      },
    ])
      expect(() => parseBackup(JSON.stringify(bad))).toThrow();
  });
});
describe("calendar, comparison and reviews", () => {
  it("starts weeks on Monday across year boundaries", () => {
    expect(weekDates(new Date(2027, 0, 3))).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
  });
  it("clamps month comparisons at leap year and month boundaries", () => {
    expect(monthBefore("2024-03-31", 1)).toBe("2024-02-29");
    expect(monthBefore("2026-03-31", 1)).toBe("2026-02-28");
    expect(monthBefore("2026-01-31", 3)).toBe("2025-10-31");
  });
  it("counts training days independently of exercise records and does not invent time", () => {
    const s = {
      ...state,
      entries: [
        ...state.entries,
        { ...state.entries[0], id: "2", minutes: 20 },
      ],
    };
    const a = summary(s, "2026-10");
    expect(a.days).toBe(1);
    expect(a.records).toBe(2);
    expect(a.minutes).toBe(20);
    expect(summary(state, "2026").minutes).toBeNull();
    expect(summary(state, "2026-09").days).toBe(0);
  });
  it("computes longest run across DST using local dates", () => {
    const entries = [
      "2026-03-07",
      "2026-03-08",
      "2026-03-09",
      "2026-03-11",
    ].map((date, i) => ({ ...state.entries[0], id: String(i), date }));
    expect(bestStreak(entries)).toBe(3);
    expect(maxWeight(entries)).toBe(25);
  });
  it("computes goal progress from actual records without giving XP", () => {
    expect(
      goalProgress(
        {
          id: "g",
          title: "target",
          kind: "weight",
          target: 50,
          exerciseId: "squat",
          done: false,
        },
        state,
      ),
    ).toBe(0.5);
    expect(
      goalProgress(
        { id: "g", title: "week", kind: "weekly", target: 2, done: false },
        state,
        "2026-10-27",
      ),
    ).toBe(0.5);
    expect(
      goalProgress(
        { id: "g", title: "free", kind: "personal", target: 1, done: true },
        state,
      ),
    ).toBe(1);
  });
  it("records earned milestones with dates and leaves future ones unearned", () => {
    expect(milestones(state)[0].date).toBe("2026-10-26");
    expect(milestones(state)[1].date).toBeUndefined();
    expect(milestones(initialState).every((m) => !m.date)).toBe(true);
  });
});
