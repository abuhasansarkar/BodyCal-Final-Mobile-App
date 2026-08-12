import { ConvexError } from "convex/values";
import type { QueryCtx } from "../_generated/server";

export async function requireIdentity(ctx: { auth: { getUserIdentity(): Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Unauthenticated");
  return identity;
}

export async function requireCurrentUser(ctx: QueryCtx) {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
  if (!user || user.lifecycleState !== "active") throw new ConvexError("User profile is unavailable");
  return user;
}
