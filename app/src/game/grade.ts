// 클리어 등급 (§6.5). 시간은 보여 주기만 하고 점수에 넣지 않는다
export type Grade = 'S' | 'A' | 'B' | 'C'

export const GRADES: Grade[] = ['S', 'A', 'B', 'C']

/** 등급의 하한 점수. 한 단계가 15점이라 "이어서 다시" 한 번이 대략 한 단계 하락이다 */
const FLOOR: Record<Exclude<Grade, 'C'>, number> = { S: 90, A: 75, B: 60 }

export interface GradeInput {
  /** 지금 시도의 최대 의심도 ("이어서 다시"를 하면 처음부터 다시 잰다) */
  maxSuspicion: number
  loginFails: number
  wrongLinks: number
  retries: number
}

export function score(g: GradeInput): number {
  const s = 100 - g.maxSuspicion * 0.4 - g.loginFails * 10 - g.wrongLinks * 2 - g.retries * 15
  return Math.max(0, Math.round(s))
}

export function gradeOf(points: number): Grade {
  if (points >= FLOOR.S) return 'S'
  if (points >= FLOOR.A) return 'A'
  if (points >= FLOOR.B) return 'B'
  return 'C'
}

/** a가 b보다 좋은 등급인가 */
export function better(a: Grade, b: Grade | undefined): boolean {
  return !b || GRADES.indexOf(a) < GRADES.indexOf(b)
}
