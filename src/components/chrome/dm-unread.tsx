"use client";

import { useEffect, useState } from "react";

// Social DM unread total for the shell's Messages dot (side menu row
// and phone dock). The chrome paints at 0 and updates when the count
// resolves, so the side menu and dock never wait on the inbox and never
// remount. A rejected or missing promise stays 0 (no dot).
export function useDmUnread(unread?: Promise<number>): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!unread) return undefined;
    let live = true;
    unread.then(
      (next) => {
        if (live) setCount(Math.max(0, next));
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [unread]);
  return count;
}
