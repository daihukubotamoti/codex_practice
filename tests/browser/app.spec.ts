import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const legacy = {
  version: 1,
  exercises: [{ id: "squat", name: "スクワット" }],
  entries: [
    {
      id: "old",
      date: "2026-09-01",
      exerciseId: "squat",
      name: "スクワット",
      sets: [
        { weight: 20, reps: 10 },
        { weight: 25, reps: 8 },
      ],
      createdAt: "2026-09-01T10:00:00Z",
    },
  ],
  rests: ["2026-09-02"],
  settings: { name: "旅人", sound: false },
};
const nav = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "メインメニュー" })
    .getByRole("button", { name, exact: true })
    .click();
async function raw(page: Page, key = "state") {
  return page.evaluate(async (key) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("komorebi-training", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return new Promise<any>((resolve, reject) => {
      const tx = db.transaction("journal", "readonly");
      const r = tx.objectStore("journal").get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      tx.oncomplete = () => db.close();
    });
  }, key);
}
async function seed(page: Page, data: unknown = legacy) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Not there yet. Still becoming." }),
  ).toBeVisible();
  await page.evaluate(async (data) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("komorebi-training", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("journal", "readwrite");
      tx.objectStore("journal").put(data, "state");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, data);
  await page.reload();
}
async function record(page: Page, name = "スクワット") {
  await nav(page, "トレーニング");
  await page.getByRole("textbox", { name: "種目名" }).fill(name);
  await page.getByRole("spinbutton", { name: "1セット目の重量" }).fill("30");
  await page.getByRole("spinbutton", { name: "1セット目の回数" }).fill("10");
  await page
    .getByRole("button", { name: "トレーニングを保存", exact: true })
    .click();
}
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-28T12:00:00Z"));
});
test("legacy data migrates intact; training drafts, prior sets, editing and offline survive", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page);
  await expect(page.getByText("40 XP", { exact: true })).toBeVisible();
  expect(await raw(page, "legacy-v1-backup")).toEqual(legacy);
  expect((await raw(page)).entries).toEqual(legacy.entries);
  await page.screenshot({
    path: "/tmp/becoming-home-ipad.png",
    fullPage: true,
    animations: "disabled",
  });
  await nav(page, "トレーニング");
  await page.getByRole("textbox", { name: "種目名" }).fill("スクワット");
  await page.getByRole("button", { name: "前回のセットを引き継ぐ" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "2セット目の重量" }),
  ).toHaveValue("25");
  await page.getByRole("spinbutton", { name: "2セット目の重量" }).fill("30");
  await page.getByRole("spinbutton", { name: "トレーニング時間" }).fill("15");
  await expect
    .poll(async () => (await raw(page, "draft-training"))?.sets?.[1]?.weight)
    .toBe("30");
  await page.reload();
  await nav(page, "トレーニング");
  await expect(
    page.getByRole("spinbutton", { name: "2セット目の重量" }),
  ).toHaveValue("30");
  await page.screenshot({
    path: "/tmp/becoming-training-ipad.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "トレーニングを保存", exact: true })
    .click();
  await expect(page.getByText("今日の積み重ねを保存しました。")).toBeVisible();
  expect((await raw(page)).entries).toHaveLength(2);
  await page
    .getByRole("button", { name: "スクワットの記録を編集" })
    .first()
    .click();
  await page.getByRole("spinbutton", { name: "2セット目の回数" }).fill("9");
  await page.getByRole("button", { name: "記録を更新する" }).click();
  await expect(page.getByText("トレーニングを更新しました。")).toBeVisible();
  expect((await raw(page)).entries).toHaveLength(2);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("80 XP", { exact: true })).toBeVisible();
  expect((await raw(page)).entries[0]).toEqual(legacy.entries[0]);
  await context.setOffline(false);
  expect(errors).toEqual([]);
});
test("journal photo, archive, new backup round trip, old backup restore, invalid JSON rejected", async ({
  page,
}) => {
  await seed(page);
  await nav(page, "日記");
  await page.getByLabel("今日頑張ったこと").fill("朝、少し歩いた。");
  await page.getByLabel("今日の自分に一言").fill("少しずつでいい。");
  await page.getByRole("button", { name: "晴れやか" }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles("tests/fixtures/journal.png");
  await expect(page.getByAltText("日記に添付する写真")).toBeVisible();
  await page.getByRole("button", { name: "この一日を保存" }).click();
  await expect(page.getByText("朝、少し歩いた。")).toBeVisible();
  expect((await raw(page)).journals[0].photo).toMatch(
    /^data:image\/jpeg;base64,/,
  );
  expect((await raw(page)).journals[0].photo.length).toBeLessThan(600000);
  expect((await raw(page)).entries).toEqual(legacy.entries);
  await nav(page, "日記");
  await expect(page.getByLabel("今日の自分に一言")).toHaveValue(
    "少しずつでいい。",
  );
  await page.reload();
  await nav(page, "日記");
  await expect(page.getByLabel("今日の自分に一言")).toHaveValue(
    "少しずつでいい。",
  );
  await nav(page, "アーカイブ");
  await page.screenshot({
    path: "/tmp/becoming-archive-ipad.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "設定・バックアップ" }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "バックアップを書き出す" }).click();
  const path = await (await dl).path();
  const backup = JSON.parse(await readFile(path!, "utf8"));
  expect(backup.version).toBe(2);
  expect(backup.journals).toHaveLength(1);
  page.once("dialog", (d) => d.accept());
  await page.locator("input[type=file]").setInputFiles(path!);
  await expect(page.getByText("バックアップから復元しました。")).toBeVisible();
  expect((await raw(page)).journals).toEqual(backup.journals);
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole("alert")).toContainText(
    "対応するバックアップではありません。",
  );
  expect((await raw(page)).journals).toHaveLength(1);
  page.once("dialog", (d) => d.accept());
  await page.locator("input[type=file]").setInputFiles({
    name: "legacy.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await expect.poll(async () => (await raw(page)).journals.length).toBe(0);
  expect((await raw(page)).entries).toEqual(legacy.entries);
  expect((await raw(page, "draft-pre-restore-backup")).journals).toHaveLength(
    1,
  );
});
test("then & now, goals, letters, monthly/year review and PNG export", async ({
  page,
}) => {
  await seed(page);
  await record(page);
  await nav(page, "成長");
  await expect(page.getByText("+5 kg の変化")).toBeVisible();
  await expect(page.getByRole("img", { name: /最大重量の推移/ })).toBeVisible();
  await page.getByRole("button", { name: "目標を追加" }).click();
  await page.getByLabel("目標", { exact: true }).fill("ベンチプレス60kg");
  await page.getByLabel("進捗の種類").selectOption("weight");
  await page.getByRole("spinbutton", { name: "目標重量 / kg" }).fill("60");
  await page
    .getByRole("combobox", { name: "種目", exact: true })
    .selectOption("squat");
  await page.getByRole("button", { name: "目標を保存" }).click();
  await expect(
    page.getByRole("progressbar", { name: "ベンチプレス60kgの進捗" }),
  ).toHaveAttribute("aria-valuenow", "50");
  await page
    .getByLabel("メッセージ", { exact: true })
    .fill("ここまで続けてくれてありがとう。");
  await page.getByLabel("開封できる日").fill("2026-11-01");
  await page.getByRole("button", { name: "手紙を預ける" }).click();
  await expect(page.getByText("Until that day.")).toBeVisible();
  await expect(
    page.getByText("ここまで続けてくれてありがとう。", { exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "/tmp/becoming-growth-ipad.png",
    fullPage: true,
    animations: "disabled",
  });
  await nav(page, "振り返り");
  await expect(page.getByText("October.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "レビュー画像を作成" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNGを保存" }).click();
  const path = await (await dl).path();
  expect((await readFile(path!)).subarray(1, 4).toString()).toBe("PNG");
  await page.getByRole("button", { name: "画像プレビューを閉じる" }).click();
  await page.screenshot({
    path: "/tmp/becoming-review-ipad.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "YEAR IN REVIEW", exact: true })
    .click();
  await expect(page.getByText("2026.", { exact: true })).toBeVisible();
  await page.clock.setFixedTime(new Date("2026-11-02T12:00:00Z"));
  await page.reload();
  await nav(page, "成長");
  await expect(
    page.getByText("ここまで続けてくれてありがとう。", { exact: true }),
  ).toBeVisible();
});
test("rest, deletion, safe rank up, settings and responsive phone/tablet", async ({
  page,
}) => {
  const legacyNear = {
    ...legacy,
    entries: [
      {
        ...legacy.entries[0],
        sets: Array.from({ length: 27 }, () => ({ weight: 20, reps: 10 })),
      },
    ],
  };
  await seed(page, legacyNear);
  await page.getByRole("button", { name: "今日を休息日として残す" }).click();
  await expect(
    page.getByRole("button", { name: "休息日として記録済み" }),
  ).toBeVisible();
  await expect(page.getByText("290 XP", { exact: true })).toBeVisible();
  await record(page);
  await expect(
    page.getByText("YOUR NEXT CHAPTER", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "新しい章の案内を閉じる" }).click();
  await expect(page.getByRole("heading", { name: /IN MOTION/ })).toBeVisible();
  expect((await raw(page)).rests).not.toContain("2026-10-28");
  for (const viewport of [
    { width: 820, height: 1180 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await nav(page, "ホーム");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/becoming-home-${viewport.width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await nav(page, "トレーニング");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await nav(page, "成長");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "設定・バックアップ" }).click();
  await page.getByRole("button", { name: "スクワットの名前を変更" }).click();
  await page
    .getByRole("textbox", { name: "新しい種目名" })
    .fill("バーベルスクワット");
  await page.getByRole("button", { name: "種目名を保存" }).click();
  await expect(
    page.getByText("バーベルスクワット", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "バーベルスクワットの種目を削除" })
    .click();
  await expect.poll(async () => (await raw(page)).entries.length).toBe(0);
});
test("conflicting tabs cannot silently overwrite saved records", async ({
  page,
  context,
}) => {
  await seed(page);
  const other = await context.newPage();
  await other.goto("/");
  await expect(
    other.getByRole("heading", { name: "Not there yet. Still becoming." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "今日を休息日として残す" }).click();
  await expect(
    page.getByRole("button", { name: "休息日として記録済み" }),
  ).toBeVisible();
  await other.getByRole("button", { name: "今日を休息日として残す" }).click();
  await expect(other.getByRole("alert")).toContainText(
    "別のタブで記録が更新されました",
  );
  expect((await raw(other)).rests).toContain("2026-10-28");
});
test("unreadable stored data is preserved without reset", async ({ page }) => {
  await seed(page, { ...legacy, version: 99 });
  await expect(page.getByRole("alert")).toContainText(
    "データは初期化していません",
  );
  expect((await raw(page)).version).toBe(99);
});
