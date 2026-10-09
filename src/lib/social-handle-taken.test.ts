import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { SOCIAL } from "@/lib/social";
import { handleTakenError, lookupHandleCollision } from "./social-handle-taken";

const editSrc = readFileSync("src/components/social/social-profile-edit.tsx", "utf8");
const handleFaceSrc = readFileSync("src/components/social/social-profile-handle-edit.tsx", "utf8");
const actionSrc = readFileSync("src/app/(app)/social/actions.ts", "utf8");

describe("handleTakenError", () => {
  it("blocks a case-insensitive collision owned by someone else", () => {
    expect(
      handleTakenError({ ownerId: "u1", collisionId: "u2" }),
    ).toBe(SOCIAL.profile.handleTaken);
  });

  it("allows an unused handle", () => {
    expect(handleTakenError({ ownerId: "u1", collisionId: null })).toBeNull();
    expect(handleTakenError({ ownerId: "u1", collisionId: undefined })).toBeNull();
  });

  it("allows the owner to keep the same handle, including casing-only edits", () => {
    expect(handleTakenError({ ownerId: "u1", collisionId: "u1" })).toBeNull();
  });
});

describe("lookupHandleCollision", () => {
  it("reads the citext handle column and returns the owning id", async () => {
    const maybeSingle = vi.fn(async () => ({ data: { id: "u2" }, error: null }));
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const owner = await lookupHandleCollision({ from } as never, "Ada");
    expect(from).toHaveBeenCalledWith("profiles");
    expect(select).toHaveBeenCalledWith("id");
    expect(eq).toHaveBeenCalledWith("handle", "Ada");
    expect(owner).toEqual({ id: "u2" });
  });

  it("wires the taken error onto the profile save path and the handle field", () => {
    expect(actionSrc).toContain("socialHandleInputError");
    expect(actionSrc).toContain("lookupHandleCollision");
    expect(actionSrc).toContain("handleTakenError");
    // Handle errors (taken included) land on the Username face; a changed
    // username waits for the server's answer before Edit closes.
    expect(editSrc).toContain("socialProfileSaveFieldError(notice)");
    expect(editSrc).toContain("setHandleError(notice)");
    expect(editSrc).toContain("showSaveError(result.error)");
    expect(editSrc).toContain("socialProfileEditHandleChanged(baseline.username, username)");
    expect(handleFaceSrc).toContain("socialHandleDisplayError");
  });
});
