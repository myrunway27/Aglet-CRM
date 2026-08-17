// "At a glance" data for a business's reviews: star breakdown plus the
// words reviewers use most, Amazon/Google-style.

const STOPWORDS = new Set(
  (
    "a an and are as at be been but by for from had has have i if in into is it its " +
    "just me my not of on or our out so than that the their them then there they this to " +
    "too up was we were what when which who will with would you your very really quite " +
    "place places business went go going got get also again after before because only even " +
    "im ive dont didnt cant wasnt isnt arent wont couldnt shouldnt do does did done being am " +
    "he she his her him one two much many more most some all any no nor never always ever " +
    "here about over under between both each few other such own same s t can now"
  ).split(/\s+/)
);

export type SnapshotData = {
  total: number;
  average: number;
  // index 0 = 1 star … index 4 = 5 stars
  histogram: [number, number, number, number, number];
  mentions: { word: string; count: number }[];
};

export function buildSnapshot(reviews: { rating: number; text: string }[]): SnapshotData | null {
  if (reviews.length === 0) return null;

  const histogram: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let sum = 0;
  const counts = new Map<string, number>();

  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    histogram[star - 1]++;
    sum += r.rating;

    // Count each word once per review so one enthusiastic reviewer
    // can't dominate the mentions.
    const seen = new Set<string>();
    for (const raw of r.text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      if (raw.length < 3 || raw.length > 24 || STOPWORDS.has(raw)) continue;
      if (/^\d+$/.test(raw)) continue;
      if (!seen.has(raw)) {
        seen.add(raw);
        counts.set(raw, (counts.get(raw) ?? 0) + 1);
      }
    }
  }

  const mentions = [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));

  return { total: reviews.length, average: sum / reviews.length, histogram, mentions };
}
