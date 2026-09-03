// 순수 엔진(battleEngine.simulate) 위에 "수동 오버라이드" 레이어를 씌우는 얇은 래퍼.
// 엔진 자체는 절대 건드리지 않음 — 오버라이드는 결과 승률만 교체하고 플래그로 표시.
import { simulate, buildReport } from './battleEngine'

// 순서 무관하게 (a,b) 쌍의 오버라이드를 찾음.
export function findOverride(overrides, aId, bId) {
  if (!overrides) return null
  return (
    overrides.find(
      (o) => (o.a === aId && o.b === bId) || (o.a === bId && o.b === aId),
    ) || null
  )
}

/**
 * A/B 매치업 결과를 반환.
 * - 오버라이드가 없으면 엔진 결과 그대로 (overridden:false).
 * - 있으면 승률만 오버라이드 값으로 교체하고 overridden:true + note.
 *   engineWinRateA 에 엔진 기본값을 함께 담아 UI에서 "기본값 대비"를 보여줄 수 있게 함.
 * 주의: 오버라이드된 매치업은 buildReport 대신 note 를 써야 함
 *       (엔진의 hax/파워 서술은 오버라이드된 승률과 불일치하기 때문 — 텍스트/계산 일치 원칙).
 */
export function resolveMatchup(A, B, overrides) {
  const base = simulate(A, B)
  const ov = findOverride(overrides, A.id, B.id)
  if (!ov) {
    return { ...base, overridden: false, engineWinRateA: base.winRateA }
  }
  const winRateA = ov.a === A.id ? ov.winRateA : 100 - ov.winRateA
  return {
    ...base,
    engineWinRateA: base.winRateA,
    winRateA,
    winRateB: 100 - winRateA,
    overridden: true,
    overrideNote: ov.note || '',
  }
}

export { buildReport }
