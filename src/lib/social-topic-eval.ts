import { SOCIAL_CATEGORY_TOPICS } from "@/lib/social-categories";
import { SOCIAL_TOPIC_NONE } from "@/lib/social-topic-tagging";

// Accuracy test for AI topic tagging (docs/infra/social-topic-tagging.md).
// The founder hand-labels posts; scripts/social-topic-eval.ts runs the
// tagger on them without writing; this scores the answers per confidence
// threshold so the founder can pick SOCIAL_TOPIC_MIN_CONFIDENCE.

export type SocialTopicLabel = { postId: string; topic: string };

export type SocialTopicEvalRow = {
  postId: string;
  expected: string;
  predicted: string;
  confidence: number;
};

export type SocialTopicThresholdScore = {
  threshold: number;
  /** Posts given a topic at this threshold. */
  tagged: number;
  /** Of those, the topic the founder chose. */
  correct: number;
  /** Of those, a different topic, or a topic where the founder chose none. */
  wrong: number;
  /** correct / tagged, or null with nothing tagged. */
  precision: number | null;
  /** Posts the founder gave a topic that got the right one. */
  recall: number | null;
};

const VALID = new Set<string>([...SOCIAL_CATEGORY_TOPICS, SOCIAL_TOPIC_NONE]);

/** Parse `post_id,topic` lines. Header optional; topic must be a locked label or "none". */
export function parseSocialTopicLabels(csv: string): { labels: SocialTopicLabel[]; errors: string[] } {
  const labels: SocialTopicLabel[] = [];
  const errors: string[] = [];
  csv.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const comma = line.indexOf(",");
    const postId = (comma === -1 ? line : line.slice(0, comma)).trim();
    const topic = (comma === -1 ? "" : line.slice(comma + 1)).trim().replace(/^"|"$/g, "");
    if (index === 0 && postId.toLowerCase() === "post_id") return;
    if (!/^[0-9a-f-]{36}$/i.test(postId)) {
      errors.push(`line ${index + 1}: post_id is not a uuid`);
      return;
    }
    if (!VALID.has(topic)) {
      errors.push(`line ${index + 1}: "${topic}" is not one of the 15 topics or none`);
      return;
    }
    labels.push({ postId, topic });
  });
  return { labels, errors };
}

export function scoreSocialTopicEval(
  rows: readonly SocialTopicEvalRow[],
  thresholds: readonly number[],
): SocialTopicThresholdScore[] {
  const withTopic = rows.filter((row) => row.expected !== SOCIAL_TOPIC_NONE).length;
  return thresholds.map((threshold) => {
    const tagged = rows.filter(
      (row) => row.predicted !== SOCIAL_TOPIC_NONE && row.confidence >= threshold,
    );
    const correct = tagged.filter((row) => row.predicted === row.expected).length;
    return {
      threshold,
      tagged: tagged.length,
      correct,
      wrong: tagged.length - correct,
      precision: tagged.length > 0 ? correct / tagged.length : null,
      recall: withTopic > 0 ? correct / withTopic : null,
    };
  });
}
