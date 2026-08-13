import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Identity always comes from `ctx.auth`. No public function accepts a user id
 * from the client, and no function trusts one if it did.
 */
export async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Unauthenticated");
  return identity;
}

/** The signed-in user's record regardless of lifecycle state. */
export async function requireUserRecord(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
  if (!user) throw new ConvexError("User profile is unavailable");
  return user;
}

/**
 * The signed-in, active user. Everything except the deletion workflow uses this;
 * a user awaiting deletion must not be able to read or write app data.
 */
export async function requireCurrentUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const user = await requireUserRecord(ctx);
  if (user.lifecycleState !== "active") throw new ConvexError("User profile is unavailable");
  return user;
}

/**
 * Load a document and prove the caller owns it. Returns null for "not found or
 * not yours" on read paths; use `requireOwned` when a write must fail loudly.
 */
type OwnedTable = "foodLogs" | "weightLogs" | "aiScans" | "customFoods" | "favorites";

export async function loadOwned<T extends OwnedTable>(
  ctx: QueryCtx | MutationCtx,
  id: Id<T>,
  userId: Id<"users">,
): Promise<Doc<T> | null> {
  const record = await ctx.db.get(id);
  if (!record || record.userId !== userId) return null;
  return record;
}

export async function requireOwned<T extends OwnedTable>(
  ctx: MutationCtx,
  id: Id<T>,
  userId: Id<"users">,
  label: string,
): Promise<Doc<T>> {
  const record = await loadOwned(ctx, id, userId);
  if (!record) throw new ConvexError(`${label} not found`);
  return record;
}

/**
 * Prove the caller uploaded a storage blob before it is attached to a log or
 * sent to the AI provider. Storage ids are unguessable but not authorization.
 */
export async function assertOwnsUpload(
  ctx: QueryCtx | MutationCtx,
  storageId: Id<"_storage">,
  userId: Id<"users">,
) {
  const upload = await ctx.db
    .query("imageUploads")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .unique();
  if (!upload || upload.userId !== userId) throw new ConvexError("Image is not available");
  return upload;
}

/**
 * Asserts ownership and marks the blob as in use, which takes it out of the
 * unattached-upload sweep in `maintenance.sweepUnattachedUploads`.
 */
export async function attachOwnedUpload(
  ctx: MutationCtx,
  storageId: Id<"_storage">,
  userId: Id<"users">,
) {
  const upload = await assertOwnsUpload(ctx, storageId, userId);
  if (upload.attachedAt === undefined) {
    await ctx.db.patch(upload._id, { attachedAt: Date.now() });
  }
  return upload;
}
