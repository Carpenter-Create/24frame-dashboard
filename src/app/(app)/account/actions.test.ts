import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/s3-avatars", () => ({
  putAvatarObject: vi.fn(),
  deleteAvatarObject: vi.fn(),
  storeAvatarReplacement: vi.fn(),
  deleteReplacedAvatarObjects: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/supabase/context";
import { revalidatePath } from "next/cache";
import { deleteAvatarObject, deleteReplacedAvatarObjects, storeAvatarReplacement } from "@/lib/s3-avatars";
import { captureException } from "@sentry/nextjs";

import { ACCOUNT_NAME_MAX, ACCOUNT_PROFILE, COMPANY_PROFILE } from "@/lib/account-profile";
import { AVATAR_CLEARED, AVATAR_MAX_BYTES, avatarObjectKey, avatarQuarantineObjectKey } from "@/lib/account-avatar";
import { removeAccountPhoto, saveAccountName, saveCompanyName, uploadAccountPhoto } from "./actions";

const USER = { id: "11111111-1111-4111-8111-111111111111", email: "ada@example.com", name: "Ada" };
const ORG_ID = "11111111-1111-4111-8111-111111111111";

function ctx({
  role = "account_owner",
  isGcStaff = false,
  hasOrg = true,
}: {
  role?: string;
  isGcStaff?: boolean;
  hasOrg?: boolean;
} = {}) {
  const org = hasOrg ? { id: ORG_ID, name: "Acme", status: "active" } : null;
  return {
    user: USER,
    rows: org ? [{ role, organizations: org }] : [],
    orgs: org ? [{ id: org.id, name: org.name }] : [],
    activeOrg: org,
    activeRole: org ? role : null,
    canOperate: role === "account_owner" || role === "delivery_ops",
    isGcStaff,
    unread: Promise.resolve(0),
  };
}

function authClient({
  updateUser = vi.fn(async () => ({ data: { user: USER }, error: null })),
  refreshSession = vi.fn(async () => ({ data: { session: {} }, error: null })),
}: {
  updateUser?: ReturnType<typeof vi.fn>;
  refreshSession?: ReturnType<typeof vi.fn>;
} = {}) {
  vi.mocked(createClient).mockResolvedValue({ auth: { updateUser, refreshSession } } as never);
  return { updateUser, refreshSession };
}

function orgClient({
  canManage = true,
  error = null,
  row = { id: ORG_ID },
}: {
  canManage?: boolean;
  error?: { message: string } | null;
  row?: { id: string } | null;
} = {}) {
  const maybeSingle = vi.fn(async () => ({ data: error ? null : row, error }));
  const select = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn((table: string) => {
    if (table !== "organizations") throw new Error(`unexpected from(${table})`);
    return { update };
  });
  const rpc = vi.fn(async (name: string, args: { p_capability?: string; p_org?: string }) => {
    if (name !== "member_can") throw new Error(`unexpected rpc(${name})`);
    expect(args.p_capability).toBe("manage_settings");
    return { data: canManage, error: null };
  });
  vi.mocked(createClient).mockResolvedValue({ from, rpc } as never);
  return { from, update, eq, rpc };
}

describe("saveAccountName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
  });

  it("writes trimmed display_name, refreshes the JWT, and does not touch email", async () => {
    const { updateUser, refreshSession } = authClient();
    await expect(saveAccountName("  Ada Lovelace  ")).resolves.toEqual({});
    expect(updateUser).toHaveBeenCalledWith({ data: { display_name: "Ada Lovelace" } });
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(updateUser.mock.invocationCallOrder[0]).toBeLessThan(
      refreshSession.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(updateUser).not.toHaveBeenCalledWith(expect.objectContaining({ email: expect.anything() }));
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
    expect(revalidatePath).toHaveBeenCalledWith("/settings/profile");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("allows an empty name so Identity stays blank", async () => {
    const { updateUser, refreshSession } = authClient();
    await expect(saveAccountName("   ")).resolves.toEqual({});
    expect(updateUser).toHaveBeenCalledWith({ data: { display_name: "" } });
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it("rejects a non-string or oversized name before Auth", async () => {
    const { updateUser } = authClient();
    await expect(saveAccountName(12)).resolves.toEqual({ error: ACCOUNT_PROFILE.invalidName });
    await expect(saveAccountName("x".repeat(ACCOUNT_NAME_MAX + 1))).resolves.toEqual({
      error: ACCOUNT_PROFILE.invalidName,
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("does not write when there is no session", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null as never);
    const { updateUser, refreshSession } = authClient();
    await expect(saveAccountName("Ada")).resolves.toEqual({ error: ACCOUNT_PROFILE.signedOut });
    expect(updateUser).not.toHaveBeenCalled();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("does not claim saved when the session cannot refresh after the write", async () => {
    const { updateUser, refreshSession } = authClient({
      refreshSession: vi.fn(async () => ({
        data: { session: null },
        error: { message: "refresh failed" },
      })),
    });
    await expect(saveAccountName("Ada Lovelace")).resolves.toEqual({ error: "refresh failed" });
    expect(updateUser).toHaveBeenCalledOnce();
    expect(refreshSession).toHaveBeenCalledOnce();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

function photoForm(file: File) {
  const body = new FormData();
  body.set("photo", file);
  return body;
}

function profileUpdateClient(
  previousKey: string | null = null,
  result: { data: { id: string }[] | null; error: { message: string } | null } = {
    data: [{ id: USER.id }],
    error: null,
  },
) {
  const maybeSingle = vi.fn(async () => ({ data: { avatar_key: previousKey }, error: null }));
  const selectEq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq: selectEq }));
  const from = vi.fn((table: string) => {
    if (table !== "profiles") throw new Error(`unexpected from(${table})`);
    return { select };
  });
  const filters: [string, string, unknown][] = [];
  const chain = {
    eq: vi.fn((column: string, value: unknown) => {
      filters.push(["eq", column, value]);
      return chain;
    }),
    is: vi.fn((column: string, value: unknown) => {
      filters.push(["is", column, value]);
      return chain;
    }),
    select: vi.fn(() => chain),
    then: (
      onFulfilled: (value: typeof result) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };
  const adminUpdate = vi.fn(() => chain);
  const adminFrom = vi.fn((table: string) => {
    if (table !== "profiles") throw new Error(`unexpected admin from(${table})`);
    return { update: adminUpdate };
  });
  vi.mocked(createClient).mockResolvedValue({ from } as never);
  vi.mocked(createAdminClient).mockReturnValue({ from: adminFrom } as never);
  return { from, adminUpdate, filters };
}

describe("uploadAccountPhoto", () => {
  const previousKey = `avatars/${USER.id}/recheck/22222222-2222-4222-8222-222222222222`;
  const nextKey = `avatars/${USER.id}/recheck/33333333-3333-4333-8333-333333333333`;
  let adminUpdate: ReturnType<typeof profileUpdateClient>["adminUpdate"];
  let filters: ReturnType<typeof profileUpdateClient>["filters"];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    vi.mocked(storeAvatarReplacement).mockResolvedValue({ key: nextKey, etag: '"etag"' });
    vi.mocked(deleteReplacedAvatarObjects).mockResolvedValue(undefined);
    const client = profileUpdateClient(previousKey);
    adminUpdate = client.adminUpdate;
    filters = client.filters;
  });

  it("stores the new face, swaps the pointer, and only then deletes the old objects", async () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "face.jpg", { type: "image/jpeg" });
    await expect(uploadAccountPhoto(photoForm(file))).resolves.toEqual({});
    const storedOrder = vi.mocked(storeAvatarReplacement).mock.invocationCallOrder[0];
    const swapOrder = adminUpdate.mock.invocationCallOrder[0];
    const deleteOrder = vi.mocked(deleteReplacedAvatarObjects).mock.invocationCallOrder[0];
    expect(storedOrder).toBeLessThan(swapOrder ?? 0);
    expect(storedOrder).toBeLessThan(deleteOrder ?? 0);
    expect(swapOrder).toBeLessThan(deleteOrder ?? 0);
    expect(storeAvatarReplacement).toHaveBeenCalledTimes(1);
    const stored = vi.mocked(storeAvatarReplacement).mock.calls[0]?.[0];
    expect(stored?.userId).toBe(USER.id);
    expect(stored?.contentType).toBe("image/jpeg");
    expect(stored?.body).toBeInstanceOf(Uint8Array);
    expect(adminUpdate).toHaveBeenCalledWith({ avatar_key: nextKey });
    expect(filters).toContainEqual(["eq", "id", USER.id]);
    expect(filters).toContainEqual(["eq", "avatar_key", previousKey]);
    expect(deleteReplacedAvatarObjects).toHaveBeenCalledWith(USER.id, previousKey, nextKey);
    expect(deleteAvatarObject).not.toHaveBeenCalled();
    expect(createAdminClient).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
    expect(revalidatePath).toHaveBeenCalledWith("/settings/profile");
    expect(revalidatePath).toHaveBeenCalledWith("/social");
    expect(revalidatePath).toHaveBeenCalledWith("/social/profile");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("leaves the old photo in place when the new object is not stored", async () => {
    vi.mocked(storeAvatarReplacement).mockRejectedValue(new Error("encode failed"));
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "face.jpg", { type: "image/jpeg" });
    await expect(uploadAccountPhoto(photoForm(file))).resolves.toEqual({ error: "encode failed" });
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(deleteReplacedAvatarObjects).not.toHaveBeenCalled();
    expect(deleteAvatarObject).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });

  it("leaves the old photo in place when the pointer swap fails", async () => {
    const client = profileUpdateClient(previousKey, { data: null, error: { message: "swap failed" } });
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "face.jpg", { type: "image/jpeg" });
    await expect(uploadAccountPhoto(photoForm(file))).resolves.toEqual({ error: "swap failed" });
    expect(client.adminUpdate).toHaveBeenCalled();
    expect(deleteReplacedAvatarObjects).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(vi.mocked(captureException).mock.calls[0]?.[0]).toMatchObject({ orphanKeys: [nextKey] });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("leaves the old photo in place when the pointer no longer matches", async () => {
    const client = profileUpdateClient(previousKey, { data: [], error: null });
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "face.jpg", { type: "image/jpeg" });
    await expect(uploadAccountPhoto(photoForm(file))).resolves.toEqual({
      error: ACCOUNT_PROFILE.photoFailed,
    });
    expect(client.filters).toContainEqual(["eq", "avatar_key", previousKey]);
    expect(deleteReplacedAvatarObjects).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(vi.mocked(captureException).mock.calls[0]?.[0]).toMatchObject({ orphanKeys: [nextKey] });
  });

  it("keeps the new photo when deleting the old objects fails", async () => {
    vi.mocked(deleteReplacedAvatarObjects).mockRejectedValue(new Error("delete failed"));
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "face.jpg", { type: "image/jpeg" });
    await expect(uploadAccountPhoto(photoForm(file))).resolves.toEqual({});
    expect(deleteReplacedAvatarObjects).toHaveBeenCalledWith(USER.id, previousKey, nextKey);
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(vi.mocked(captureException).mock.calls[0]?.[0]).toMatchObject({
      orphanKeys: [avatarObjectKey(USER.id), previousKey],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/social/profile");
  });

  it("matches a null pointer with is(null) and deletes quarantine copies only after the swap", async () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "face.jpg", { type: "image/jpeg" });
    const absent = profileUpdateClient(null);
    await expect(uploadAccountPhoto(photoForm(file))).resolves.toEqual({});
    expect(absent.filters).toContainEqual(["is", "avatar_key", null]);
    expect(deleteReplacedAvatarObjects).toHaveBeenCalledWith(USER.id, null, nextKey);

    const quarantine = avatarQuarantineObjectKey(USER.id, "22222222-2222-4222-8222-222222222222");
    const held = profileUpdateClient(quarantine);
    await expect(uploadAccountPhoto(photoForm(file))).resolves.toEqual({});
    expect(held.filters).toContainEqual(["eq", "avatar_key", quarantine]);
    expect(deleteReplacedAvatarObjects).toHaveBeenLastCalledWith(USER.id, quarantine, nextKey);
    expect(deleteAvatarObject).not.toHaveBeenCalled();
  });

  it("rejects a missing file, a gif, and an oversized file before S3", async () => {
    await expect(uploadAccountPhoto(new FormData())).resolves.toEqual({
      error: ACCOUNT_PROFILE.photoMissing,
    });
    const gif = new File([new Uint8Array([1])], "face.gif", { type: "image/gif" });
    await expect(uploadAccountPhoto(photoForm(gif))).resolves.toEqual({
      error: ACCOUNT_PROFILE.photoType,
    });
    const big = new File([new Uint8Array(AVATAR_MAX_BYTES + 1)], "face.jpg", {
      type: "image/jpeg",
    });
    await expect(uploadAccountPhoto(photoForm(big))).resolves.toEqual({
      error: ACCOUNT_PROFILE.photoTooLarge,
    });
    expect(storeAvatarReplacement).not.toHaveBeenCalled();
  });

  it("does not write when there is no session", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null as never);
    const file = new File([new Uint8Array([1])], "face.jpg", { type: "image/jpeg" });
    await expect(uploadAccountPhoto(photoForm(file))).resolves.toEqual({
      error: ACCOUNT_PROFILE.signedOut,
    });
    expect(storeAvatarReplacement).not.toHaveBeenCalled();
  });
});

describe("removeAccountPhoto", () => {
  const previousKey = `avatars/${USER.id}/recheck/22222222-2222-4222-8222-222222222222`;
  let adminUpdate: ReturnType<typeof profileUpdateClient>["adminUpdate"];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    vi.mocked(deleteAvatarObject).mockResolvedValue(undefined);
    adminUpdate = profileUpdateClient(previousKey).adminUpdate;
  });

  it("DELETEs the session user's face and does not touch email", async () => {
    await expect(removeAccountPhoto()).resolves.toEqual({});
    expect(adminUpdate).toHaveBeenCalledWith({ avatar_key: AVATAR_CLEARED });
    expect(deleteAvatarObject).toHaveBeenCalledTimes(1);
    expect(deleteAvatarObject).toHaveBeenCalledWith(USER.id, previousKey);
    expect(revalidatePath).toHaveBeenCalledWith("/social/profile");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("does not write when there is no session", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null as never);
    await expect(removeAccountPhoto()).resolves.toEqual({
      error: ACCOUNT_PROFILE.signedOut,
    });
    expect(deleteAvatarObject).not.toHaveBeenCalled();
  });
});

describe("saveCompanyName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
  });

  it("updates organizations.name on the org the form rendered", async () => {
    const { update, eq, rpc } = orgClient();
    await expect(saveCompanyName({ orgId: ORG_ID, name: "  Northlight  " })).resolves.toEqual({});
    expect(rpc).toHaveBeenCalledWith("member_can", {
      p_uid: USER.id,
      p_org: ORG_ID,
      p_capability: "manage_settings",
    });
    expect(update).toHaveBeenCalledWith({ name: "Northlight" });
    expect(eq).toHaveBeenCalledWith("id", ORG_ID);
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
    expect(revalidatePath).toHaveBeenCalledWith("/settings/profile");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("does not follow a later active-org cookie when the form org is passed", async () => {
    const other = "22222222-2222-4222-8222-222222222222";
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ role: "account_owner" }) as never,
    );
    const { eq, rpc } = orgClient();
    await expect(saveCompanyName({ orgId: other, name: "Northlight" })).resolves.toEqual({});
    expect(rpc).toHaveBeenCalledWith("member_can", {
      p_uid: USER.id,
      p_org: other,
      p_capability: "manage_settings",
    });
    expect(eq).toHaveBeenCalledWith("id", other);
    expect(eq).not.toHaveBeenCalledWith("id", ORG_ID);
  });

  it("rejects an empty company name", async () => {
    const { update, rpc } = orgClient();
    await expect(saveCompanyName({ orgId: ORG_ID, name: "  " })).resolves.toEqual({
      error: COMPANY_PROFILE.nameRequired,
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("blocks when member_can manage_settings is false — including GC staff without that capability", async () => {
    const { update, rpc } = orgClient({ canManage: false });
    await expect(saveCompanyName({ orgId: ORG_ID, name: "Northlight" })).resolves.toEqual({
      error: COMPANY_PROFILE.forbidden,
    });
    expect(rpc).toHaveBeenCalledOnce();
    expect(update).not.toHaveBeenCalled();
  });
});
