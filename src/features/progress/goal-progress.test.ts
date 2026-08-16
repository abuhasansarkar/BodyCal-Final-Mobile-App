import { calculateGoalProgress } from "@/features/progress/goal-progress";
import { describe, expect, it } from "@jest/globals";

describe("calculateGoalProgress", () => {
  it("only rewards movement toward a loss goal", () => {
    expect(calculateGoalProgress(80, 75, 70)).toBe(50);
    expect(calculateGoalProgress(80, 85, 70)).toBe(0);
  });

  it("only rewards movement toward a gain goal", () => {
    expect(calculateGoalProgress(60, 65, 70)).toBe(50);
    expect(calculateGoalProgress(60, 55, 70)).toBe(0);
  });

  it("clamps overshoot and handles a maintenance target", () => {
    expect(calculateGoalProgress(80, 65, 70)).toBe(100);
    expect(calculateGoalProgress(70, 70, 70)).toBe(100);
    expect(calculateGoalProgress(70, 71, 70)).toBe(0);
  });
});
