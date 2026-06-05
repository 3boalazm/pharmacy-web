/**
 * CODE39 — مولّد باركود SVG بدون مكتبات (للّيبل الداخلي MED-000123).
 * اخترنا CODE39 لأن جدوله الصغير قابل للمراجعة يدويًا وكل قارئات USB تدعمه افتراضيًا.
 * كل حرف 9 عناصر (5 خانات بار + 4 فراغات)، n=ضيق، w=عريض (3×)، وفاصل ضيق بين الحروف.
 */
const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn",
  "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw",
  "8": "wnnwnnwnn", "9": "nnwwnnwnn",
  A: "wnnnnwnnw", B: "nnwnnwnnw", C: "wnwnnwnnn", D: "nnnnwwnnw",
  E: "wnnnwwnnn", F: "nnwnwwnnn", G: "nnnnnwwnw", H: "wnnnnwwnn",
  I: "nnwnnwwnn", J: "nnnnwwwnn", K: "wnnnnnnww", L: "nnwnnnnww",
  M: "wnwnnnnwn", N: "nnnnwnnww", O: "wnnnwnnwn", P: "nnwnwnnwn",
  Q: "nnnnnnwww", R: "wnnnnnwwn", S: "nnwnnnwwn", T: "nnnnwnwwn",
  U: "wwnnnnnnw", V: "nwwnnnnnw", W: "wwwnnnnnn", X: "nwnnwnnnw",
  Y: "wwnnwnnnn", Z: "nwwnwnnnn", "-": "nwnnnnwnw", ".": "wwnnnnwnn",
  " ": "nwwnnnwnn", "*": "nwnnwnwnn",
};

/** يبني SVG قابلًا للمسح. يرجع null لو النص فيه حرفًا خارج المجموعة. */
export function code39Svg(raw: string, opts: { height?: number; narrow?: number } = {}): string | null {
  const text = `*${raw.toUpperCase()}*`;
  const narrow = opts.narrow ?? 2;
  const wide = narrow * 3;
  const height = opts.height ?? 56;

  let x = 0;
  const bars: { x: number; w: number }[] = [];
  for (const ch of text) {
    const pattern = CODE39[ch];
    if (!pattern) return null;
    for (let i = 0; i < 9; i++) {
      const w = pattern[i] === "w" ? wide : narrow;
      if (i % 2 === 0) bars.push({ x, w }); // عناصر زوجية = بارات
      x += w;
    }
    x += narrow; // فاصل بين الحروف
  }
  const width = x - narrow;
  const rects = bars.map((b) => `<rect x="${b.x}" y="0" width="${b.w}" height="${height}" />`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" fill="#000" shape-rendering="crispEdges">${rects}</svg>`;
}
