// Founder-run accuracy test for AI topic tagging. Reads production posts and
// calls Claude; it never writes. See docs/infra/social-topic-tagging.md.
//
//   pnpm exec tsx --conditions=react-server scripts/social-topic-eval.ts labels.csv
//
// labels.csv: one `post_id,topic` per line (topic is one of the 15 labels or
// "none"). Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, the
// Social media env (MEDIA_AWS_* and S3_MEDIA_SOURCE_BUCKET), the Mux env,
// and the CLAUDE_AWS_* set. Never print their values. Captions are not
// printed either; the report shows post ids only. A post that fails to read
// is skipped with its error, not scored. Spends roughly a cent per post; a
// few frames per video. It reads the same media live tagging reads.

import { readFileSync } from "node:fs";

import { createClaudeClient, readClaudeConfig } from "../src/lib/claude-client";
import { createAdminClient } from "../src/lib/supabase/admin";
import { SOCIAL_TOPIC_MEDIA_WAIT_MS } from "../src/lib/social-topic-media";
import { decideSocialPostTopic } from "../src/lib/social-topic-tagger";
import { SOCIAL_TOPIC_LOGIC_VERSION, SOCIAL_TOPIC_NONE } from "../src/lib/social-topic-tagging";
import {
  parseSocialTopicLabels,
  scoreSocialTopicEval,
  type SocialTopicEvalRow,
} from "../src/lib/social-topic-eval";

const THRESHOLDS = [0.5, 0.6, 0.7, 0.8, 0.9] as const;

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: social-topic-eval.ts labels.csv");
  const { labels, errors } = parseSocialTopicLabels(readFileSync(path, "utf8"));
  if (errors.length > 0) throw new Error(`labels.csv:\n${errors.join("\n")}`);
  const config = readClaudeConfig();
  if (!config) throw new Error("No Claude provider configured (CLAUDE_AWS_* or ANTHROPIC_API_KEY).");

  const admin = createAdminClient();
  const client = createClaudeClient(config);
  const rows: SocialTopicEvalRow[] = [];
  let skipped = 0;
  for (const label of labels) {
    const { data: post, error } = await admin
      .from("posts")
      .select("id, author_id, body, media, created_at, edited_at")
      .eq("id", label.postId)
      .maybeSingle();
    if (error || !post) {
      console.warn(`skip ${label.postId}: not found`);
      skipped += 1;
      continue;
    }
    // Past the media wait, so a preparing video is read as it is now.
    const now = new Date(Math.max(Date.now(), Date.parse(post.created_at) + SOCIAL_TOPIC_MEDIA_WAIT_MS));
    let decided;
    try {
      decided = await decideSocialPostTopic({
        admin,
        client,
        post,
        now,
        minConfidence: 0,
      });
    } catch (cause) {
      // Not scored: a read or model error says nothing about accuracy.
      console.warn(`skip ${post.id}: ${cause instanceof Error ? cause.message : String(cause)}`);
      skipped += 1;
      continue;
    }
    const predicted = decided?.result?.topic ?? SOCIAL_TOPIC_NONE;
    const confidence = decided?.result?.confidence ?? 0;
    rows.push({ postId: post.id, expected: label.topic, predicted, confidence });
    const mark = predicted === label.topic ? "ok   " : "MISS ";
    console.log(`${mark}${post.id}  expected=${label.topic}  got=${predicted} (${confidence.toFixed(2)})`);
  }

  console.log(`\n${SOCIAL_TOPIC_LOGIC_VERSION}: ${rows.length} posts scored, ${skipped} skipped`);
  console.log("threshold  tagged  correct  wrong  precision  recall");
  for (const score of scoreSocialTopicEval(rows, THRESHOLDS)) {
    const pct = (value: number | null) => (value === null ? "   -" : `${Math.round(value * 100)}%`.padStart(4));
    console.log(
      `${score.threshold.toFixed(2).padStart(9)}  ${String(score.tagged).padStart(6)}  ${String(score.correct).padStart(7)}  ${String(score.wrong).padStart(5)}  ${pct(score.precision).padStart(9)}  ${pct(score.recall).padStart(6)}`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
