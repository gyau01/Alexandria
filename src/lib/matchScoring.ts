// lib/matchScoring.ts
export const SCORING = {
  minTotal: 1200,
  priorityMultiplier: 1.5,
  maxTotal: 2250,

  classes: { points: 600, weight: 1 },
  major:   { points: 600, weight: 1 },
  year:    { points: 600, weight: 1 },
  studyTime:{ points: 150, weight: 1 },
  location:{ points: 150, weight: 1 },
  style:   { points: 150, weight: 1 }
};

export function applyScore(
  matched: boolean,
  basePoints: number,
  weight: number,
  priority: boolean
) {
  if (!matched) return 0;
  let score = basePoints * weight;
  if (priority) score *= SCORING.priorityMultiplier;
  return score;
}