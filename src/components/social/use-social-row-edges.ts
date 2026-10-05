"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { socialRowScrollEdges } from "@/lib/social-feed-reels";

/**
 * Start / end of a horizontal row (feed topics, Reels rail). Before the
 * row measures it reads as the board draws it at rest: at the start, with
 * more to the right (fade shown, Previous off, Next on). A row that fits
 * flips to "end" on the first measure.
 */
export function useSocialRowEdges<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  start: boolean;
  end: boolean;
  measure: () => void;
} {
  const ref = useRef<T | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const next = socialRowScrollEdges({
      scrollLeft: node.scrollLeft,
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
    });
    setEdges((current) =>
      current.start === next.start && current.end === next.end ? current : next,
    );
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    measure();
    node.addEventListener("scroll", measure, { passive: true });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    resize?.observe(node);
    return () => {
      node.removeEventListener("scroll", measure);
      resize?.disconnect();
    };
  }, [measure]);

  return { ref, start: edges.start, end: edges.end, measure };
}
