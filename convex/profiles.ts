import { queryGeneric as query } from "convex/server";
import { requireCurrentUser } from "./lib/auth";
export const getCurrent = query({ args: {}, handler: async (ctx) => { const user = await requireCurrentUser(ctx); return ctx.db.query("userProfiles").withIndex("by_user", (q) => q.eq("userId", user._id)).unique(); } });
