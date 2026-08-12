import { cronJobs, makeFunctionReference } from "convex/server";

const crons = cronJobs();
crons.interval("delete expired AI scan images", { hours: 6 }, makeFunctionReference<"mutation">("maintenance:deleteExpiredScanImages"), {});
export default crons;
