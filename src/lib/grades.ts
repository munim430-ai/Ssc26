export const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C', 'D', 'F'] as const
export type Grade = (typeof GRADES)[number]

export function isGrade(x: unknown): x is Grade {
  return typeof x === 'string' && (GRADES as readonly string[]).includes(x)
}
