"use server";

import { revalidatePath } from "next/cache";

import {
  ASK_GLOBEE,
  askGlobeeComposerSubmit,
  askGlobeeConversationTitle,
  canRenderAskGlobeeLanding,
  isAskGlobeeThreadId,
  resolveMessagesSurface,
  type AskGlobeeTier,
  type MessagesSurface,
} from "@/lib/ask-globee";
import {
  answerAskGlobeePrompt,
  type AskGlobeeHistoryTurn,
} from "@/lib/ask-globee-operator";
import {
  nextAskGlobeeThumb,
  sortAskGlobeeHistory,
  type AskGlobeeHistoryRow,
  type AskGlobeeStoredMessage,
  type AskGlobeeThumb,
} from "@/lib/ask-globee-conversations";
import { socialFrameAiContinuingConversation } from "@/lib/social-frame-ai";
import { userMenuAvatarInitial } from "@/lib/user-menu";
import { UNPAGINATED_MAX, rangeFor } from "@/lib/list-bounds";
import { loadMyFindings } from "@/lib/my-lists";
import { getActiveOrgTier } from "@/lib/org-tier";
import { getOrgContext, type OrgContext } from "@/lib/supabase/context";
import { createClient } from "@/lib/supabase/server";

type ActionError = { error: string };
type Client = Awaited<ReturnType<typeof createClient>>;
type AskGlobeeOrg = {
  ctx: OrgContext & { activeOrg: NonNullable<OrgContext["activeOrg"]> };
  tier: AskGlobeeTier;
};

async function requireAskGlobeeOrg(): Promise<AskGlobeeOrg | ActionError> {
  const ctx = await getOrgContext();
  if (!ctx) return { error: "Not authenticated." };
  const tier = ctx.activeOrg ? await getActiveOrgTier(ctx.activeOrg.id) : null;
  const surface = resolveMessagesSurface({
    isGcStaff: ctx.isGcStaff,
    hasActiveOrg: !!ctx.activeOrg,
    tier,
  });
  if (!canRenderAskGlobeeLanding(surface) || !ctx.activeOrg || !tier) {
    return { error: "Not authorized." };
  }
  return { ctx: { ...ctx, activeOrg: ctx.activeOrg }, tier };
}

async function loadOrgAnswer(
  supabase: Client,
  orgId: string,
  prompt: string,
  tier: AskGlobeeTier,
  history: AskGlobeeHistoryTurn[] = [],
) {
  const { data: titleRows } = await supabase
    .from("titles")
    .select("id, title, status, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .range(...rangeFor(UNPAGINATED_MAX));
  const findings = await loadMyFindings(supabase, { orgId });
  return answerAskGlobeePrompt({
    prompt,
    corpus: {
      orgId,
      titles: titleRows ?? [],
      findings: findings.rows,
      findingsIsPartial: findings.truncated,
      tier,
      now: new Date(),
      bound: UNPAGINATED_MAX,
    },
    history,
  });
}

export async function startAskGlobeeConversation(
  prompt: string,
): Promise<{ conversationId?: string; error?: string }> {
  const gate = await requireAskGlobeeOrg();
  if ("error" in gate) return gate;
  const next = askGlobeeComposerSubmit(prompt);
  if (!next) return { error: "Ask a question or give a command." };

  const supabase = await createClient();
  const orgId = gate.ctx.activeOrg.id;
  const { data: conversation, error: conversationError } = await supabase
    .from("ai_conversations")
    .insert({
      org_id: orgId,
      title: askGlobeeConversationTitle(next),
      created_by: gate.ctx.user.id,
    })
    .select("id")
    .single();
  if (conversationError || !conversation) {
    return { error: conversationError?.message ?? "Could not start the conversation." };
  }

  const { error: userError } = await supabase.from("ai_conversation_messages").insert({
    org_id: orgId,
    conversation_id: conversation.id,
    role: "user",
    body: next,
  });
  if (userError) return { error: userError.message };

  return { conversationId: conversation.id };
}

export async function loadAskAiOverlay(threadId?: string | null): Promise<{
  surface: MessagesSurface;
  initials: string;
  displayName: string | null;
  conversations: AskGlobeeHistoryRow[];
  conversation: AskGlobeeHistoryRow | null;
  messages: AskGlobeeStoredMessage[];
}> {
  const ctx = await getOrgContext();
  const empty = {
    surface: "access-gate" as const,
    initials: "?",
    displayName: null as string | null,
    conversations: [] as AskGlobeeHistoryRow[],
    conversation: null,
    messages: [] as AskGlobeeStoredMessage[],
  };
  if (!ctx) return empty;
  const initials = userMenuAvatarInitial(ctx.user.email);
  const displayName = ctx.user.name ?? null;
  const tier = ctx.activeOrg ? await getActiveOrgTier(ctx.activeOrg.id) : null;
  const surface = resolveMessagesSurface({
    isGcStaff: ctx.isGcStaff,
    hasActiveOrg: !!ctx.activeOrg,
    tier,
  });
  if (!canRenderAskGlobeeLanding(surface) || !ctx.activeOrg) {
    return { ...empty, surface, initials, displayName };
  }

  const supabase = await createClient();
  const orgId = ctx.activeOrg.id;
  const { data: historyRows } = await supabase
    .from("ai_conversations")
    .select("id, title, pinned_at, created_at, updated_at")
    .eq("org_id", orgId)
    .range(...rangeFor(UNPAGINATED_MAX));
  const conversations = sortAskGlobeeHistory((historyRows ?? []) as AskGlobeeHistoryRow[]);
  const nextThread = threadId && isAskGlobeeThreadId(threadId) ? threadId : null;
  if (!nextThread) {
    return { surface, initials, displayName, conversations, conversation: null, messages: [] };
  }

  const { data: conversationRow } = await supabase
    .from("ai_conversations")
    .select("id, title, pinned_at, created_at, updated_at")
    .eq("id", nextThread)
    .eq("org_id", orgId)
    .maybeSingle();
  const conversation = (conversationRow as AskGlobeeHistoryRow | null) ?? null;
  if (!conversation) {
    return { surface, initials, displayName, conversations, conversation: null, messages: [] };
  }
  const { data: messageRows } = await supabase
    .from("ai_conversation_messages")
    .select("id, role, body, lead, follow, thumbs, created_at")
    .eq("conversation_id", conversation.id)
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })
    .range(...rangeFor(UNPAGINATED_MAX));
  return {
    surface,
    initials,
    displayName,
    conversations,
    conversation,
    messages: (messageRows ?? []) as AskGlobeeStoredMessage[],
  };
}

/** Social Messages thread. Same Ask rows as the overlay. Latest conversation only. */
export async function loadSocialFrameAiThread(): Promise<{
  ready: boolean;
  conversationId: string | null;
  messages: AskGlobeeStoredMessage[];
}> {
  const landing = await loadAskAiOverlay(null);
  if (!canRenderAskGlobeeLanding(landing.surface)) {
    return { ready: false, conversationId: null, messages: [] };
  }
  const latest = socialFrameAiContinuingConversation(landing.conversations);
  if (!latest) return { ready: true, conversationId: null, messages: [] };
  const thread = await loadAskAiOverlay(latest.id);
  if (!canRenderAskGlobeeLanding(thread.surface) || !thread.conversation) {
    return { ready: false, conversationId: null, messages: [] };
  }
  return {
    ready: true,
    conversationId: thread.conversation.id,
    messages: thread.messages,
  };
}

export async function completeAskGlobeeTurn(
  conversationId: string,
): Promise<ActionError | Record<string, never>> {
  const gate = await requireAskGlobeeOrg();
  if ("error" in gate) return gate;
  if (!isAskGlobeeThreadId(conversationId)) return { error: "Conversation not found." };

  const supabase = await createClient();
  const orgId = gate.ctx.activeOrg.id;
  const { data: conversation } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!conversation) return { error: "Conversation not found." };

  const { data: priorRows } = await supabase
    .from("ai_conversation_messages")
    .select("role, body, lead")
    .eq("conversation_id", conversationId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })
    .range(...rangeFor(UNPAGINATED_MAX));
  const rows = priorRows ?? [];
  const last = rows.at(-1);
  if (!last || last.role !== "user") return {};
  const next = askGlobeeComposerSubmit(last.body);
  if (!next) return { error: "Ask a question or give a command." };

  const history: AskGlobeeHistoryTurn[] = [];
  for (const row of rows.slice(0, -1)) {
    if (row.role === "user") history.push({ role: "user", text: row.body });
    if (row.role === "globee") history.push({ role: "globee", text: row.lead ?? row.body });
  }

  const answer = await loadOrgAnswer(supabase, orgId, next, gate.tier, history);
  if ("error" in answer) return { error: answer.error };

  const { error: globeeError } = await supabase.from("ai_conversation_messages").insert({
    org_id: orgId,
    conversation_id: conversationId,
    role: "globee",
    body: answer.lead,
    lead: answer.lead,
    follow: answer.follow,
  });
  if (globeeError) return { error: globeeError.message };

  revalidatePath("/", "layout");
  return {};
}

export async function appendAskGlobeeTurn(
  conversationId: string,
  prompt: string,
): Promise<ActionError | Record<string, never>> {
  const gate = await requireAskGlobeeOrg();
  if ("error" in gate) return gate;
  if (!isAskGlobeeThreadId(conversationId)) return { error: "Conversation not found." };
  const next = askGlobeeComposerSubmit(prompt);
  if (!next) return { error: "Ask a question or give a command." };

  const supabase = await createClient();
  const orgId = gate.ctx.activeOrg.id;
  const { data: conversation } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!conversation) return { error: "Conversation not found." };

  const { data: priorRows } = await supabase
    .from("ai_conversation_messages")
    .select("role, body, lead")
    .eq("conversation_id", conversationId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })
    .range(...rangeFor(UNPAGINATED_MAX));
  const history: AskGlobeeHistoryTurn[] = [];
  for (const row of priorRows ?? []) {
    if (row.role === "user") history.push({ role: "user", text: row.body });
    if (row.role === "globee") history.push({ role: "globee", text: row.lead ?? row.body });
  }

  const answer = await loadOrgAnswer(supabase, orgId, next, gate.tier, history);
  if ("error" in answer) return { error: answer.error };
  const { error: userError } = await supabase.from("ai_conversation_messages").insert({
    org_id: orgId,
    conversation_id: conversationId,
    role: "user",
    body: next,
  });
  if (userError) return { error: userError.message };

  const { error: globeeError } = await supabase.from("ai_conversation_messages").insert({
    org_id: orgId,
    conversation_id: conversationId,
    role: "globee",
    body: answer.lead,
    lead: answer.lead,
    follow: answer.follow,
  });
  if (globeeError) return { error: globeeError.message };

  revalidatePath("/", "layout");
  return {};
}

export async function setAskGlobeeThumb(
  messageId: string,
  clicked: AskGlobeeThumb,
): Promise<ActionError | { thumbs: AskGlobeeThumb | null }> {
  const gate = await requireAskGlobeeOrg();
  if ("error" in gate) return gate;
  if (!isAskGlobeeThreadId(messageId)) return { error: "Message not found." };

  const supabase = await createClient();
  const { data: message } = await supabase
    .from("ai_conversation_messages")
    .select("id, role, thumbs, org_id")
    .eq("id", messageId)
    .eq("org_id", gate.ctx.activeOrg.id)
    .maybeSingle();
  if (!message || message.role !== "globee") return { error: "Message not found." };

  const thumbs = nextAskGlobeeThumb(message.thumbs, clicked);
  const { error } = await supabase
    .from("ai_conversation_messages")
    .update({ thumbs })
    .eq("id", messageId)
    .eq("org_id", gate.ctx.activeOrg.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { thumbs };
}

export async function renameAskGlobeeConversation(
  conversationId: string,
  title: string,
): Promise<ActionError | { title: string }> {
  const gate = await requireAskGlobeeOrg();
  if ("error" in gate) return gate;
  if (!isAskGlobeeThreadId(conversationId)) return { error: "Conversation not found." };
  const next = askGlobeeConversationTitle(title);
  if (!next) return { error: ASK_GLOBEE.renameTitle };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .update({ title: next })
    .eq("id", conversationId)
    .eq("org_id", gate.ctx.activeOrg.id)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Conversation not found." };
  revalidatePath("/", "layout");
  return { title: next };
}

export async function pinAskGlobeeConversation(
  conversationId: string,
  pinned: boolean,
): Promise<ActionError | { pinnedAt: string | null }> {
  const gate = await requireAskGlobeeOrg();
  if ("error" in gate) return gate;
  if (!isAskGlobeeThreadId(conversationId)) return { error: "Conversation not found." };

  const pinnedAt = pinned ? new Date().toISOString() : null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .update({ pinned_at: pinnedAt })
    .eq("id", conversationId)
    .eq("org_id", gate.ctx.activeOrg.id)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Conversation not found." };
  revalidatePath("/", "layout");
  return { pinnedAt };
}

export async function deleteAskGlobeeConversation(
  conversationId: string,
): Promise<ActionError | Record<string, never>> {
  const gate = await requireAskGlobeeOrg();
  if ("error" in gate) return gate;
  if (!isAskGlobeeThreadId(conversationId)) return { error: "Conversation not found." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("org_id", gate.ctx.activeOrg.id)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Conversation not found." };
  revalidatePath("/", "layout");
  return {};
}
