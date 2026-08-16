export function calculateGoalProgress(startKg: number, currentKg: number, goalKg: number) {
  const targetDistance = Math.abs(goalKg - startKg);
  if (targetDistance < 0.05) return Math.abs(currentKg - goalKg) < 0.05 ? 100 : 0;

  const direction = Math.sign(goalKg - startKg);
  const progressDistance = (currentKg - startKg) * direction;
  return Math.round(Math.min(100, Math.max(0, (progressDistance / targetDistance) * 100)));
}
