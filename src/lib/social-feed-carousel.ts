import { SOCIAL } from "@/lib/social";

// Adam lock 2026-09-25. Feed / Home post cards only.
// Two or more media items become one swipe carousel.
// One item keeps the existing single-media frame.
// Stories, compose, and DM do not use this.

export const SOCIAL_FEED_CAROUSEL_MIN_ITEMS = 2;

export function socialFeedUsesCarousel(count: number): boolean {
  return Number.isInteger(count) && count >= SOCIAL_FEED_CAROUSEL_MIN_ITEMS;
}

export function socialFeedCarouselIndex(scrollLeft: number, slideWidth: number, total: number): number {
  if (!Number.isFinite(scrollLeft) || !Number.isFinite(slideWidth) || slideWidth <= 0 || total <= 0) {
    return 0;
  }
  const next = Math.round(scrollLeft / slideWidth);
  if (!Number.isFinite(next) || next <= 0) return 0;
  if (next > total - 1) return total - 1;
  return next;
}

/** 1-based visible counter. "1 of 3". */
export function socialFeedCarouselLabel(index: number, total: number): string {
  if (!Number.isInteger(total) || total <= 0) return SOCIAL.post.carouselCount(0, 0);
  const current = Math.min(total, Math.max(1, Math.trunc(index) + 1));
  return SOCIAL.post.carouselCount(current, total);
}

/** The counter chip on the photo (H register): "1 / 3". */
export function socialFeedCarouselChip(index: number, total: number): string {
  if (!Number.isInteger(total) || total <= 0) return SOCIAL.post.carouselChip(0, 0);
  const current = Math.min(total, Math.max(1, Math.trunc(index) + 1));
  return SOCIAL.post.carouselChip(current, total);
}

export function socialFeedCarouselShowLabel(index: number, total: number): string {
  if (!Number.isInteger(total) || total <= 0) return SOCIAL.post.carouselShow(0, 0);
  const current = Math.min(total, Math.max(1, Math.trunc(index) + 1));
  return SOCIAL.post.carouselShow(current, total);
}

/** Carousel video faces are Mux playback ids only. Cookie and proxy URLs stay off the slide. */
export function socialFeedCarouselVideoUsesMux(item: {
  kind: "image" | "video";
  playbackId?: string;
}): boolean {
  return item.kind === "video" && typeof item.playbackId === "string" && item.playbackId.length > 0;
}
