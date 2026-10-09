"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  DELIVER_BATCH,
  DELIVER_MAX_TITLES,
  deliverFailureReason,
  deliverStops,
  type DeliverChoicesResult,
  type DeliverCreated,
  type DeliverExisting,
  type DeliverFailed,
  type DeliverReason,
  type DeliverTitleRow,
  type DeliverTitlesResult,
} from "@/lib/deliver-stepper";
import { GC_DELIVERIES_HREF } from "@/lib/gc-deliveries";
import { loadDeliverChoiceRows, uniqueIds } from "@/lib/gc-deliveries-companions";
import { UNPAGINATED_MAX, probeRange, splitProbe } from "@/lib/list-bounds";
import { getOrgContext } from "@/lib/supabase/context";
import { createClient } from "@/lib/supabase/server";

// Deliver: the window over Licensing Status
// (docs/design-locks/staff-licensing-deliver-window-lock-v1.md). GC staff with
// operate only. Every call passes the gate FIRST, then validates its input,
// before any read or write. The browser sends no org: create_delivery takes it
// from the title row. Database text is logged here and never sent to the
// browser; the window maps reason keys to approved lines.

const uuid = z
  .string()
  .uuid()
  .transform((value) => value.toLowerCase());

const loadInput = z.object({
  titleIds: z.array(uuid).min(1).max(DELIVER_MAX_TITLES),
});

const deliverInput = z
  .object({
    vendorId: uuid,
    items: z
      .array(
        z.object({
          titleId: uuid,
          grantId: uuid,
          territory: z.string().regex(/^[A-Z]{2}$/),
        }),
      )
      .min(1)
      .max(DELIVER_BATCH),
  })
  .refine((value) => new Set(value.items.map((item) => item.titleId)).size === value.items.length);

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Signed in, GC staff, not under view-as, and gc_can(operate) literally
 *  true. Fails closed: an rpc error refuses. */
async function deliverGate(): Promise<
  { ok: true; supabase: ServerClient } | { ok: false; reason: "not_authenticated" | "not_authorized" }
> {
  const ctx = await getOrgContext();
  if (!ctx) return { ok: false, reason: "not_authenticated" };
  // The view-as cookie is scoped to /aggregation; refused here regardless.
  if (!ctx.isGcStaff || ctx.aggregationViewAs) return { ok: false, reason: "not_authorized" };
  const supabase = await createClient();
  const { data: canOperate, error } = await supabase.rpc("gc_can", {
    p_uid: ctx.user.id,
    p_capability: "operate",
  });
  if (error) {
    console.error("[deliver] gc_can failed", error.code, error.message);
    return { ok: false, reason: "not_authorized" };
  }
  if (canOperate !== true) return { ok: false, reason: "not_authorized" };
  return { ok: true, supabase };
}

/** The selected titles (in selection order), the ids the read did not return,
 *  and their current grants, for the window to plan its faces. */
export async function loadDeliverChoices(input: unknown): Promise<DeliverChoicesResult> {
  const gate = await deliverGate();
  if (!gate.ok) return { ok: false, reason: gate.reason };

  const parsed = loadInput.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const ids = uniqueIds(parsed.data.titleIds);

  const rows = await loadDeliverChoiceRows(gate.supabase, ids);
  if ("error" in rows) return { ok: false, reason: rows.error };

  const byId = new Map(rows.titles.map((row) => [row.id, row]));
  const titles: DeliverTitleRow[] = [];
  const notFound: string[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (row) titles.push({ id: row.id, title: row.title, status: row.status });
    else notFound.push(id);
  }
  return { ok: true, titles, notFound, grants: rows.grants };
}

/** Existing deliveries for this channel and these titles, keyed by
 *  title|territory|grant. Null when the read failed or was cut off (the
 *  unique key then answers a retry). */
async function existingDeliveries(
  supabase: ServerClient,
  vendorId: string,
  titleIds: string[],
): Promise<Map<string, string> | null> {
  const { data, error } = await supabase
    .from("deliveries")
    .select("id, title_id, territory, grant_id")
    .eq("vendor_id", vendorId)
    .in("title_id", titleIds)
    .range(...probeRange(UNPAGINATED_MAX));
  if (error) {
    console.error("[deliver] deliveries pre-read failed", error.code, error.message);
    return null;
  }
  const part = splitProbe(data, UNPAGINATED_MAX);
  if (part.truncated) return null;
  return new Map(part.rows.map((row) => [existingKey(row.title_id, row.territory, row.grant_id), row.id]));
}

function existingKey(titleId: string, territory: string, grantId: string): string {
  return `${titleId.toLowerCase()}|${territory}|${grantId.toLowerCase()}`;
}

/** One batch (at most 25): one create_delivery per title, in order. A part
 *  that saved stays saved; each title reports its own outcome; sign-out, lost
 *  permission and an inactive channel stop the run. */
export async function deliverTitles(input: unknown): Promise<DeliverTitlesResult> {
  const created: DeliverCreated[] = [];
  const existing: DeliverExisting[] = [];
  const failed: DeliverFailed[] = [];

  const gate = await deliverGate();
  if (!gate.ok) return { created, existing, failed, stop: gate.reason };

  const parsed = deliverInput.safeParse(input);
  if (!parsed.success) return { created, existing, failed, stop: "invalid" };
  const { vendorId, items } = parsed.data;
  const { supabase } = gate;

  const known = await existingDeliveries(
    supabase,
    vendorId,
    items.map((item) => item.titleId),
  );

  let stop: DeliverReason | null = null;
  for (const item of items) {
    const found = known?.get(existingKey(item.titleId, item.territory, item.grantId));
    if (found) {
      existing.push({ titleId: item.titleId, deliveryId: found });
      continue;
    }
    const { data, error } = await supabase.rpc("create_delivery", {
      p_title_id: item.titleId,
      p_vendor_id: vendorId,
      p_grant_id: item.grantId,
      p_territory: item.territory,
    });
    if (!error && data) {
      created.push({ titleId: item.titleId, deliveryId: data });
      continue;
    }
    if (error) console.error("[deliver] create_delivery failed", error.code, error.message);
    const reason = error ? deliverFailureReason(error) : "unknown";
    if (reason === "existing") {
      existing.push({ titleId: item.titleId, deliveryId: null });
      continue;
    }
    if (deliverStops(reason)) {
      stop = reason;
      break;
    }
    failed.push({ titleId: item.titleId, reason });
  }

  if (created.length > 0) revalidatePath(GC_DELIVERIES_HREF);
  return { created, existing, failed, stop };
}
