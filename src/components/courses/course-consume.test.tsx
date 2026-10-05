import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
import type { CourseOutlineModule } from "@/lib/courses";
import { CourseConsume } from "./course-consume";

const modules: CourseOutlineModule[] = [
  {
    id: "m1",
    course_id: "c1",
    title: "Orientation",
    position: 1,
    lessons: [
      {
        id: "l1",
        module_id: "m1",
        title: "What this workspace is",
        position: 1,
        duration_seconds: 90,
        free_preview: true,
        summary: null,
        cover_key: null,
        lesson_type: "lesson",
        education_video_id: null,
        source_key: null,
        hls_key: null,
        encode_status: null,
      },
      {
        id: "l2",
        module_id: "m1",
        title: "What comes later",
        position: 2,
        duration_seconds: 120,
        free_preview: false,
        summary: null,
        cover_key: null,
        lesson_type: "lesson",
        education_video_id: null,
        source_key: null,
        hls_key: null,
        encode_status: null,
      },
    ],
  },
];

describe("CourseConsume layout", () => {
  it("puts the playlist beside the player and marks the first lesson active", () => {
    const html = renderToStaticMarkup(<CourseConsume modules={modules} hasAccess />);
    const playerAt = html.indexOf("data-course-player");
    const playlistAt = html.indexOf("data-course-playlist");
    expect(playerAt).toBeGreaterThan(-1);
    expect(playlistAt).toBeGreaterThan(playerAt);
    expect(html).toContain("lg:flex-row");
    expect(html).toContain(SOCIAL.courses.playlist);
    expect(html).toContain('data-course-lesson="l1"');
    expect(html).toContain("data-course-lesson-active");
    expect(html).toContain("1m 30s");
    expect(html).toContain("2m");
    expect(html).not.toContain("data-course-resume");
    expect(html).not.toContain("Resume");
    expect(html).not.toContain("watched");
    expect(html).not.toMatch(/Buy|checkout|Stripe/i);
  });

  it("keeps list-to-watch on the playlist row and does not invent progress", () => {
    const src = readFileSync("src/components/courses/course-consume.tsx", "utf8");
    expect(src).toContain("onClick={() => setSelectedId(lesson.id)}");
    expect(src).toContain("lg:flex-row");
    expect(src).not.toContain("lesson_progress");
    expect(src).not.toContain("Resume");
    expect(src).not.toMatch(/shadow-/);
    expect(src.indexOf("data-course-player")).toBeLessThan(src.indexOf("data-course-playlist"));
  });
});
