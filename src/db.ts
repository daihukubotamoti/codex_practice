import { openDB } from "idb";
import { initialState, parseBackup, type State } from "./model";
// Keep the original database and object store: never delete/reset user data.
const database = () =>
  openDB("komorebi-training", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("journal"))
        db.createObjectStore("journal");
    },
  });
export async function load(): Promise<State> {
  const db = await database();
  const tx = db.transaction("journal", "readwrite");
  const raw = await tx.store.get("state");
  if (!raw) {
    await tx.done;
    return structuredClone(initialState);
  }
  let state: State;
  try {
    state = parseBackup(JSON.stringify(raw));
  } catch (e) {
    tx.abort();
    await tx.done.catch(() => {});
    throw e;
  }
  if (raw.version === 1) {
    if (!(await tx.store.get("legacy-v1-backup")))
      await tx.store.put(raw, "legacy-v1-backup");
    await tx.store.put(state, "state");
  }
  await tx.done;
  return state;
}
export async function save(state: State): Promise<State> {
  const db = await database();
  const tx = db.transaction("journal", "readwrite");
  const current = await tx.store.get("state");
  if ((current?.revision ?? 0) !== state.revision) {
    tx.abort();
    await tx.done.catch(() => {});
    throw Error(
      "別のタブで記録が更新されました。入力を控えてから再読み込みしてください。",
    );
  }
  const next = { ...state, revision: state.revision + 1 };
  await tx.store.put(next, "state");
  await tx.done;
  return next;
}
export async function readDraft<T>(key: string): Promise<T | undefined> {
  return (await database()).get("journal", `draft-${key}`);
}
export async function writeDraft(key: string, value: unknown) {
  const db = await database();
  if (value === undefined) await db.delete("journal", `draft-${key}`);
  else await db.put("journal", value, `draft-${key}`);
}
export async function legacyBackup() {
  return (await database()).get("journal", "legacy-v1-backup");
}
