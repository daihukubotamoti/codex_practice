import { summary, type State } from "./model";
export async function preparePhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error(
      "JPEG・PNG・WebPの写真を選んでください。HEICはJPEGに変換してから追加できます。",
    );
  if (file.size > 20 * 1024 * 1024)
    throw Error("20MB以下の写真を選んでください。");
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(Error("写真を読み込めませんでした。"));
      i.src = url;
    });
    const scale = Math.min(1, 1440 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("写真の処理に失敗しました。");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    let quality = 0.82,
      data = canvas.toDataURL("image/jpeg", quality);
    while (data.length > 600_000 && quality > 0.35) {
      quality -= 0.1;
      data = canvas.toDataURL("image/jpeg", quality);
    }
    if (data.length > 1_500_000)
      throw Error(
        "写真を十分に圧縮できませんでした。小さい写真を選んでください。",
      );
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function jsonDownload(value: unknown, name: string) {
  downloadBlob(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
    name,
  );
}
export async function reviewImage(state: State, period: string): Promise<Blob> {
  await document.fonts.ready;
  const stats = summary(state, period);
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 1600;
  const x = c.getContext("2d");
  if (!x) throw Error("画像を作成できませんでした。");
  x.fillStyle = "#f1f0ec";
  x.fillRect(0, 0, 1200, 1600);
  x.fillStyle = "#171717";
  x.font = "600 28px Arial";
  x.fillText("BECOMING.", 80, 100);
  x.textAlign = "right";
  x.font = "20px Arial";
  x.fillText("A PERSONAL GROWTH ARCHIVE", 1120, 100);
  x.textAlign = "left";
  x.fillRect(80, 135, 1040, 2);
  x.font = "20px Arial";
  x.fillText(
    period.length === 4 ? "YEAR IN REVIEW" : "MONTHLY REVIEW",
    80,
    196,
  );
  x.font = "110px Georgia";
  x.fillText(period.replace("-", " / "), 75, 340);
  x.fillStyle = "#dddcd8";
  x.fillRect(80, 400, 1040, 460);
  const grad = x.createLinearGradient(300, 400, 900, 900);
  grad.addColorStop(0, "#999");
  grad.addColorStop(0.5, "#ecebe7");
  grad.addColorStop(1, "#b8b8b4");
  x.fillStyle = grad;
  x.beginPath();
  x.moveTo(350, 860);
  x.lineTo(750, 400);
  x.lineTo(900, 400);
  x.lineTo(500, 860);
  x.fill();
  x.fillStyle = "#161616";
  x.font = "italic 94px Georgia";
  x.fillText("Still becoming.", 120, 780);
  const items = [
    ["TRAINING DAYS", String(stats.days)],
    ["PERSONAL BESTS", String(stats.pbs)],
    ["SETS COMPLETED", String(stats.sets)],
  ];
  items.forEach(([label, value], i) => {
    const left = 80 + i * 357;
    x.fillStyle = "#171717";
    x.font = "80px Arial";
    x.fillText(value, left, 1020);
    x.font = "17px Arial";
    x.fillText(label, left, 1070);
  });
  x.fillStyle = "#777";
  x.fillRect(80, 1120, 1040, 1);
  x.fillStyle = "#333";
  x.font = '26px "Noto Sans JP", sans-serif';
  const quote =
    stats.journals.find((j) => j.message.trim())?.message ??
    "昨日の自分を、今日の自分が超えていく。";
  let line = "",
    row = 0;
  for (const char of quote.slice(0, 100)) {
    if (x.measureText(line + char).width > 1010 || char === "\n") {
      x.fillText(line, 80, 1210 + row * 46);
      line = char === "\n" ? "" : char;
      row++;
    } else line += char;
    if (row >= 3) break;
  }
  if (row < 3) x.fillText(line, 80, 1210 + row * 46);
  x.font = "18px Arial";
  x.fillStyle = "#666";
  x.fillText("EVERY SMALL EFFORT IS A PART OF YOU.", 80, 1500);
  x.textAlign = "right";
  x.fillText("PRIVATE RECORD / " + period, 1120, 1500);
  return new Promise((resolve, reject) =>
    c.toBlob(
      (b) => (b ? resolve(b) : reject(Error("画像を書き出せませんでした。"))),
      "image/png",
    ),
  );
}
