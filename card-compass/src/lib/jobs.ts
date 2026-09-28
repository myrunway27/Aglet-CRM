import "server-only";
import { db } from "./db";
import { formatMinor } from "./money";
import { finishLabel } from "./catalog/types";
import { pushToUser } from "./push";
import { mapLimit, referencesFor } from "./references";
import { subtypeLabel, SOURCES, type SourceId } from "./prices";
import { shouldTrigger, totalCollection, valueItem, type AlertDirection } from "./valuation";
import { log } from "./log";

const today = (now: number) => new Date(new Date(now).toISOString().slice(0, 10) + "T00:00:00Z");

/** Value a user's collection and upsert today's snapshot per source. */
export async function valueCollection(userId: string, now = Date.now()) {
  const client = db();
  if (!client) return null;
  const items = await client.collectionItem.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  const ids = [...new Set(items.map((i) => i.catalogId))];
  const refsById = new Map(
    await mapLimit(ids, 4, async (id) => [id, await referencesFor(id, now)] as const),
  );
  const valued = items.map((item) => {
    const r = refsById.get(item.catalogId);
    return { item, quantity: item.quantity, valuation: valueItem(item, r?.refs ?? []), fromStore: r?.fromStore ?? false };
  });
  const totals = totalCollection(valued);
  if (items.length) {
    await Promise.all(
      totals.map((t) =>
        client.collectionValueSnapshot.upsert({
          where: { userId_day_source: { userId, day: today(now), source: t.source } },
          create: { userId, day: today(now), source: t.source, currency: t.currency, amountMinor: t.amountMinor, itemsPriced: t.itemsPriced, itemsTotal: t.itemsTotal },
          update: { amountMinor: t.amountMinor, itemsPriced: t.itemsPriced, itemsTotal: t.itemsTotal },
        }),
      ),
    );
  }
  return { valued, totals };
}

/** Evaluate every active alert once. Returns counts. */
export async function checkAlerts(now = Date.now()) {
  const client = db();
  if (!client) return { checked: 0, triggered: 0 };
  const alerts = await client.priceAlert.findMany({ where: { active: true } });
  const ids = [...new Set(alerts.map((a) => a.catalogId))];
  const refsById = new Map(await mapLimit(ids, 4, async (id) => [id, await referencesFor(id, now)] as const));
  let triggered = 0;
  for (const a of alerts) {
    const ref = refsById.get(a.catalogId)?.refs.find((r) => r.source === a.source && r.finish === a.finish && r.subtype === a.subtype);
    if (!ref) {
      await client.priceAlert.update({ where: { id: a.id }, data: { lastCheckedAt: new Date(now) } });
      continue;
    }
    const fire = shouldTrigger({
      value: ref.amountMinor,
      previous: a.lastValueMinor,
      direction: a.direction as AlertDirection,
      threshold: a.thresholdMinor,
      lastTriggeredAt: a.lastTriggeredAt,
      now,
    });
    await client.priceAlert.update({
      where: { id: a.id },
      data: { lastValueMinor: ref.amountMinor, lastCheckedAt: new Date(now), ...(fire ? { lastTriggeredAt: new Date(now) } : {}) },
    });
    if (!fire) continue;
    triggered++;
    const src = SOURCES[a.source as SourceId]?.label ?? a.source;
    const title = `${a.cardName}: ${src} ${subtypeLabel(a.subtype).toLowerCase()} is ${a.direction} ${formatMinor(a.thresholdMinor, a.currency)}`;
    const body = `Now ${formatMinor(ref.amountMinor, ref.currency)} (${finishLabel(a.finish)}, as of ${ref.observedAt.slice(0, 10)}). Reference price, not a listing.`;
    const url = `/cards/${encodeURIComponent(a.catalogId)}?finish=${encodeURIComponent(a.finish)}&lang=en&grading=raw&condition=NM`;
    await client.notification.create({ data: { userId: a.userId, title, body, url } });
    await pushToUser(a.userId, { title, body, url });
  }
  log.info("jobs.alerts_checked", { checked: alerts.length, triggered });
  return { checked: alerts.length, triggered };
}

export async function snapshotAllCollections(now = Date.now()) {
  const client = db();
  if (!client) return { users: 0 };
  const users = await client.collectionItem.findMany({ distinct: ["userId"], select: { userId: true } });
  for (const u of users) await valueCollection(u.userId, now);
  return { users: users.length };
}
