import { ConvexError, v } from "convex/values";

import { mutation } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";

export const submit = mutation({
  args: {
    feedback: v.optional(v.string()),
    locale: v.string(),
    rating: v.number(),
  },
  returns: v.id("userFeedback"),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const feedback = args.feedback?.trim();
    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) {
      throw new ConvexError("Rating must be an integer from 1 to 5");
    }
    if (feedback && feedback.length > 1_000) {
      throw new ConvexError("Feedback must be 1,000 characters or fewer");
    }
    if (args.locale.length < 2 || args.locale.length > 35) {
      throw new ConvexError("Locale is invalid");
    }
    return ctx.db.insert("userFeedback", {
      userId: user._id,
      rating: args.rating,
      feedback: feedback || undefined,
      locale: args.locale,
      source: "post_purchase",
      createdAt: Date.now(),
    });
  },
});
