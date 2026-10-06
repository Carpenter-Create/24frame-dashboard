import { describe, expect, it, afterEach } from "vitest";

import {
  EDUCATION_AWS_ACCOUNT,
  EDUCATION_AWS_REGION,
  EDUCATION_BUCKETS,
  EDUCATION_ADMIN,
  EDUCATION_HREF,
  EDUCATION_IMAGE_MAX_BYTES,
  EDUCATION_VIDEO_MAX_BYTES,
  assertEducationBucketName,
  educationCoverKey,
  educationCourseHref,
  educationHlsAssetKey,
  educationHlsContentType,
  educationHlsCookiePath,
  educationHlsCookieResource,
  educationHlsManifestKey,
  educationHlsPlaybackHref,
  educationHlsPrefix,
  educationLessonCoverKey,
  educationLessonSourceKey,
  allocateCourseSlug,
  durationSecondsToMinutesInput,
  educationCharCount,
  isEducationCatalogCode,
  minutesToDurationSeconds,
  educationCommercialLabel,
  canRefreshEducationEncode,
  canStartEducationEncode,
  educationEncodeLabel,
  educationEncodePill,
  educationQuietDate,
  moveOrderedIds,
  educationPriceInputValue,
  educationProductModel,
  formatEducationPriceCents,
  isEducationObjectKey,
  parseEducationPriceDollars,
  resolveEducationProduct,
  isForbiddenEducationBucket,
  isForbiddenEducationKey,
  lessonPlaybackReady,
  mapMediaConvertJobStatus,
  normalizeCourseSlug,
  normalizeEducationCoverContentType,
  normalizeEducationSourceContentType,
  educationPutLengthAllowed,
  storedEducationObjectRejection,
  validateEducationUpload,
} from "./education";

const COURSE = "11111111-1111-4111-8111-111111111111";
const LESSON = "22222222-2222-4222-8222-222222222222";

describe("education names and keys", () => {
  afterEach(() => {
    delete process.env.S3_BUCKET;
    delete process.env.S3_AVATARS_BUCKET;
    delete process.env.S3_MEDIA_SOURCE_BUCKET;
    delete process.env.S3_MEDIA_OUTPUT_BUCKET;
    delete process.env.S3_FINANCE_BUCKET;
  });

  it("proposes the Education source/output pair on the E8 account", () => {
    expect(EDUCATION_AWS_ACCOUNT).toBe("405912452061");
    expect(EDUCATION_AWS_REGION).toBe("us-west-2");
    expect(EDUCATION_BUCKETS.source.prod).toBe("24frame-education-source-prod");
    expect(EDUCATION_BUCKETS.source.dev).toBe("24frame-education-source-dev");
    expect(EDUCATION_BUCKETS.output.prod).toBe("24frame-education-output-prod");
    expect(EDUCATION_BUCKETS.output.dev).toBe("24frame-education-output-dev");
    expect(EDUCATION_HREF).toBe("/education");
    expect(educationCourseHref("welcome-to-24frame")).toBe("/education/welcome-to-24frame");
    expect(EDUCATION_ADMIN.manage).toBe("Manage courses");
    expect(EDUCATION_ADMIN.title).toBe("Manage courses");
    expect(EDUCATION_ADMIN.addLesson).toBe("Add lesson");
    expect(EDUCATION_ADMIN.newCourse).toBe("New course");
    expect(JSON.stringify(EDUCATION_ADMIN)).not.toContain("Welcome");
    expect(JSON.stringify(EDUCATION_ADMIN)).not.toContain("New & For You");
    expect(JSON.stringify(EDUCATION_ADMIN)).not.toContain("Home");
  });

  it("keeps object keys on the courses prefix", () => {
    expect(educationCoverKey(COURSE, "image/jpeg")).toBe(`courses/${COURSE}/cover.jpg`);
    expect(educationLessonCoverKey(COURSE, LESSON, "image/jpeg")).toBe(
      `courses/${COURSE}/lessons/${LESSON}/cover.jpg`,
    );
    expect(educationLessonSourceKey(COURSE, LESSON, "video/mp4")).toBe(
      `courses/${COURSE}/lessons/${LESSON}/source.mp4`,
    );
    expect(educationHlsPrefix(COURSE, LESSON)).toBe(`courses/${COURSE}/lessons/${LESSON}/hls/`);
    expect(educationHlsManifestKey(COURSE, LESSON)).toBe(
      `courses/${COURSE}/lessons/${LESSON}/hls/source.m3u8`,
    );
    expect(educationHlsCookiePath(COURSE, LESSON)).toBe(
      `/courses/${COURSE}/lessons/${LESSON}/hls`,
    );
    expect(educationHlsCookieResource("https://d-education.cloudfront.net", COURSE, LESSON)).toBe(
      `https://d-education.cloudfront.net/courses/${COURSE}/lessons/${LESSON}/hls/*`,
    );
    expect(educationHlsPlaybackHref(COURSE, LESSON)).toBe(
      `/api/education/hls/${COURSE}/${LESSON}/source.m3u8`,
    );
    expect(educationHlsAssetKey(COURSE, LESSON, "source_hls.m3u8")).toBe(
      `courses/${COURSE}/lessons/${LESSON}/hls/source_hls.m3u8`,
    );
    expect(educationHlsAssetKey(COURSE, LESSON, "source_hls_00001.ts")).toBe(
      `courses/${COURSE}/lessons/${LESSON}/hls/source_hls_00001.ts`,
    );
    expect(educationHlsAssetKey(COURSE, LESSON, "../secret.ts")).toBeNull();
    expect(educationHlsAssetKey(COURSE, LESSON, "orgs/x")).toBeNull();
    expect(educationHlsContentType("source.m3u8")).toBe("application/vnd.apple.mpegurl");
    expect(educationHlsContentType("source_hls_00001.ts")).toBe("video/mp2t");
    expect(isEducationObjectKey(`courses/${COURSE}/cover.jpg`)).toBe(true);
    expect(isEducationObjectKey(`courses/${COURSE}/lessons/${LESSON}/cover.jpg`)).toBe(true);
    expect(isEducationObjectKey(`posts/${COURSE}/${LESSON}.jpg`)).toBe(false);
  });

  it("refuses title, finance, social, and avatar buckets", () => {
    expect(isForbiddenEducationBucket("24frame-education-source-dev")).toBe(false);
    expect(isForbiddenEducationBucket("24frame-media-source-prod")).toBe(true);
    expect(isForbiddenEducationBucket("gc-content-assets")).toBe(true);
    expect(isForbiddenEducationBucket("24frame-finance-prod")).toBe(true);
    expect(isForbiddenEducationBucket("gc-avatars-prod")).toBe(true);
    process.env.S3_BUCKET = "title-film-bucket";
    process.env.S3_FINANCE_BUCKET = "live-finance";
    process.env.S3_MEDIA_SOURCE_BUCKET = "live-media-source";
    expect(isForbiddenEducationBucket("title-film-bucket")).toBe(true);
    expect(isForbiddenEducationBucket("live-finance")).toBe(true);
    expect(isForbiddenEducationBucket("live-media-source")).toBe(true);
    expect(() => assertEducationBucketName("gc-content-assets", "S3_EDUCATION_SOURCE_BUCKET")).toThrow(
      /dedicated 24Frame education bucket/,
    );
  });

  it("refuses foreign key prefixes", () => {
    expect(isForbiddenEducationKey(`orgs/${COURSE}/titles/${LESSON}/master/a.mov`)).toBe(true);
    expect(isForbiddenEducationKey(`posts/${COURSE}/${LESSON}.jpg`)).toBe(true);
    expect(isForbiddenEducationKey(`avatars/${COURSE}/avatar`)).toBe(true);
    expect(isForbiddenEducationKey(`courses/${COURSE}/../cover.jpg`)).toBe(true);
  });

  it("normalizes slugs and upload bounds", () => {
    expect(normalizeCourseSlug(" Welcome To 24Frame ")).toBe("welcome-to-24frame");
    expect(normalizeCourseSlug("***")).toBeNull();
    expect(validateEducationUpload({ kind: "cover", contentType: "image/png", byteLength: 12 })).toMatchObject({
      ok: true,
    });
    expect(validateEducationUpload({ kind: "source", contentType: "image/png", byteLength: 12 })).toMatchObject({
      ok: false,
      error: "type",
    });
    expect(validateEducationUpload({ kind: "cover", contentType: "image/jpeg", byteLength: 0 })).toEqual({
      ok: false,
      error: "missing",
    });
    expect(validateEducationUpload({ kind: "cover", contentType: "image/jpeg", byteLength: 1.5 })).toEqual({
      ok: false,
      error: "missing",
    });
    expect(
      validateEducationUpload({
        kind: "source",
        contentType: "video/mp4",
        byteLength: EDUCATION_VIDEO_MAX_BYTES,
      }),
    ).toMatchObject({ ok: true });
    expect(
      validateEducationUpload({
        kind: "source",
        contentType: "video/mp4",
        byteLength: EDUCATION_VIDEO_MAX_BYTES + 1,
      }),
    ).toEqual({ ok: false, error: "tooLarge" });
    expect(
      validateEducationUpload({
        kind: "cover",
        contentType: "image/jpeg",
        byteLength: EDUCATION_IMAGE_MAX_BYTES + 1,
      }),
    ).toEqual({
      ok: false,
      error: "tooLarge",
    });
    const cover = educationCoverKey(COURSE, "image/jpeg");
    const source = educationLessonSourceKey(COURSE, LESSON, "video/mp4");
    expect(educationPutLengthAllowed(cover, "image/jpeg", 1200)).toBe(true);
    expect(educationPutLengthAllowed(cover, "image/jpeg", EDUCATION_IMAGE_MAX_BYTES + 1)).toBe(false);
    expect(educationPutLengthAllowed(source, "video/mp4", EDUCATION_VIDEO_MAX_BYTES)).toBe(true);
    expect(educationPutLengthAllowed(source, "video/mp4", EDUCATION_VIDEO_MAX_BYTES + 1)).toBe(false);
    expect(educationPutLengthAllowed(cover, "video/mp4", 1200)).toBe(false);
    expect(storedEducationObjectRejection(cover, null)).toBe("missing");
    expect(storedEducationObjectRejection(cover, { bytes: 0, contentType: "image/jpeg" })).toBe("missing");
    expect(storedEducationObjectRejection(cover, { bytes: EDUCATION_IMAGE_MAX_BYTES + 1, contentType: "image/jpeg" })).toBe(
      "tooLarge",
    );
    expect(storedEducationObjectRejection(cover, { bytes: 1200, contentType: "video/mp4" })).toBe("type");
    expect(storedEducationObjectRejection(cover, { bytes: 1200, contentType: "image/jpeg" })).toBeNull();
    expect(storedEducationObjectRejection(cover, { bytes: 1200, contentType: null })).toBeNull();
    expect(storedEducationObjectRejection(source, { bytes: EDUCATION_VIDEO_MAX_BYTES + 1, contentType: "video/mp4" })).toBe(
      "tooLarge",
    );
    expect(normalizeEducationCoverContentType("image/jpg", "cover.JPG")).toBe("image/jpeg");
    expect(normalizeEducationCoverContentType("", "poster.webp")).toBe("image/webp");
    expect(normalizeEducationCoverContentType("image/gif", "x.gif")).toBe("image/gif");
    expect(normalizeEducationSourceContentType("video/mp4", "lesson.mp4")).toBe("video/mp4");
    expect(normalizeEducationSourceContentType("", "smoke.MP4")).toBe("video/mp4");
    expect(normalizeEducationSourceContentType("video/x-m4v", "clip.m4v")).toBe("video/mp4");
    expect(normalizeEducationSourceContentType("video/avi", "x.avi")).toBe("video/avi");
  });

  it("treats complete + playback key as ready", () => {
    expect(
      lessonPlaybackReady({
        encode_status: "complete",
        hls_key: educationHlsManifestKey(COURSE, LESSON),
      }),
    ).toBe(true);
    expect(lessonPlaybackReady({ encode_status: "running", hls_key: educationHlsManifestKey(COURSE, LESSON) })).toBe(
      false,
    );
    expect(educationEncodeLabel("complete")).toBe("Complete");
    expect(educationEncodeLabel("submit_failed", true)).toBe("Submit failed");
    expect(educationEncodeLabel(null, true)).toBe("Source ready.");
    expect(educationEncodeLabel(null, false)).toBe("No source yet.");
    expect(educationEncodePill(null, false)).toBe("No source");
    expect(educationEncodePill(null, true)).toBe("Source ready");
    expect(educationEncodePill("submitted", true)).toBe("Encoding");
    expect(educationEncodePill("running", true)).toBe("Encoding");
    expect(educationEncodePill("complete", true)).toBe("Complete");
    expect(educationEncodePill("failed", true)).toBe("Error");
    expect(educationEncodePill("submit_failed", true)).toBe("Error");
    expect(canRefreshEducationEncode("running")).toBe(true);
    expect(canRefreshEducationEncode("submit_failed")).toBe(true);
    expect(canRefreshEducationEncode(null)).toBe(false);
    expect(educationQuietDate("2026-09-12T14:00:00.000Z")).toBe("Sep 12, 2026");
    expect(moveOrderedIds(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(mapMediaConvertJobStatus("PROGRESSING")).toBe("running");
    expect(mapMediaConvertJobStatus("COMPLETE")).toBe("complete");
    expect(mapMediaConvertJobStatus("ERROR")).toBe("failed");
  });

  it("maps Free to flagship with a null price and Paid to one-time cents", () => {
    expect(resolveEducationProduct({ model: "free", priceCents: 4900 })).toEqual({
      ok: true,
      is_flagship_free: true,
      price_cents: null,
    });
    expect(resolveEducationProduct({ model: "paid", priceCents: 4900 })).toEqual({
      ok: true,
      is_flagship_free: false,
      price_cents: 4900,
    });
    expect(resolveEducationProduct({ model: "paid", priceCents: null })).toEqual({ ok: false });
    expect(parseEducationPriceDollars("49")).toBe(4900);
    expect(parseEducationPriceDollars("49.50")).toBe(4950);
    expect(parseEducationPriceDollars("0")).toBeNull();
    expect(educationPriceInputValue(4900)).toBe("49.00");
    expect(formatEducationPriceCents(4950)).toBe("$49.50");
    expect(educationProductModel(true)).toBe("free");
    expect(educationProductModel(false)).toBe("paid");
    expect(educationCommercialLabel(true, null)).toBe("Free");
    expect(educationCommercialLabel(false, 4900)).toBe("Paid · $49.00");
  });

  it("allocates unique slugs, catalog codes, minutes, and char counts", () => {
    expect(allocateCourseSlug("Welcome To 24Frame", [])).toBe("welcome-to-24frame");
    expect(allocateCourseSlug("Welcome To 24Frame", ["welcome-to-24frame"])).toBe("welcome-to-24frame-2");
    expect(allocateCourseSlug("Welcome", ["other-slug"], "Welcome To 24Frame")).toBe(
      "welcome-to-24frame",
    );
    expect(isEducationCatalogCode("EDU-0001")).toBe(true);
    expect(isEducationCatalogCode("edu-1")).toBe(false);
    expect(minutesToDurationSeconds(12)).toBe(720);
    expect(minutesToDurationSeconds(0)).toBeNull();
    expect(durationSecondsToMinutesInput(720)).toBe("12");
    expect(educationCharCount("", 80)).toBe("0/80");
    expect(educationCharCount("Lesson", 80)).toBe("6/80");
    expect(educationCharCount("", 200)).toBe("0/200");
  });

  it("lets staff start encode when source is present and status is none, failed, or submit_failed", () => {
    const source = educationLessonSourceKey(COURSE, LESSON, "video/mp4");
    expect(canStartEducationEncode({ source_key: source, encode_status: null })).toBe(true);
    expect(canStartEducationEncode({ source_key: source, encode_status: "failed" })).toBe(true);
    expect(canStartEducationEncode({ source_key: source, encode_status: "submit_failed" })).toBe(true);
    expect(canStartEducationEncode({ source_key: source, encode_status: "submitted" })).toBe(false);
    expect(canStartEducationEncode({ source_key: source, encode_status: "running" })).toBe(false);
    expect(canStartEducationEncode({ source_key: source, encode_status: "complete" })).toBe(false);
    expect(canStartEducationEncode({ source_key: null, encode_status: "submit_failed" })).toBe(false);
  });
});
