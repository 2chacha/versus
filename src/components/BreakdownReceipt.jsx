import { TIER_LABEL, COLOR_WIN, COLOR_LOSE } from '../lib/constants'

// 승자 기준으로 부호를 맞춘 값을 그대로 표기 (엔진 breakdown 값을 재계산 없이 사용).
function fmt(n) {
  const r = Math.round(n * 10) / 10
  return (r >= 0 ? '+' : '') + r
}

function valueColor(n) {
  return n > 0 ? COLOR_WIN : n < 0 ? COLOR_LOSE : '#94a3b8'
}

// buildReport 와 동일한 note 데이터에서 hax 적중/저항 요약(한 줄) 생성 — 텍스트만 요약, 점수는 breakdown 사용.
function haxSummary(result, winnerIsA) {
  const winnerHax = winnerIsA ? result.aOnB : result.bOnA
  const loserHax = winnerIsA ? result.bOnA : result.aOnB
  const short = (l) => l.split(' - ')[0]
  const wLanded = winnerHax.notes.filter((n) => n.landed).map((n) => short(n.trait.label))
  const lLanded = loserHax.notes.filter((n) => n.landed).map((n) => short(n.trait.label))
  const lResisted = loserHax.notes.filter((n) => !n.landed).map((n) => short(n.trait.label))
  const wResisted = winnerHax.notes.filter((n) => !n.landed).map((n) => short(n.trait.label))
  const parts = []
  if (wLanded.length) parts.push(`승자 적중 ${wLanded.join('·')}`)
  if (lLanded.length) parts.push(`상대 적중 ${lLanded.join('·')}`)
  if (lResisted.length) parts.push(`상대 시도 저항 ${lResisted.join('·')}`)
  if (wResisted.length) parts.push(`승자 시도 저항 ${wResisted.join('·')}`)
  return parts.length ? parts.join(' · ') : 'hax 없음 — 순수 스탯/티어 대결'
}

function Row({ label, value, v, sub }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 border-b border-dashed border-slate-700/60 py-1.5">
        <span className="text-slate-400">{label}</span>
        <span className="shrink-0 font-mono font-semibold tabular-nums" style={{ color: valueColor(v) }}>
          {value}
        </span>
      </div>
      {sub && <div className="pb-1 pt-0.5 text-[11px] leading-snug text-slate-500">{sub}</div>}
    </div>
  )
}

/**
 * 산출 영수증 — result.breakdown 값을 승자 기준으로 표시. 프론트에서 근사치 재계산 없음.
 */
export default function BreakdownReceipt({ result, a, b }) {
  const bd = result.breakdown
  if (!bd) return null

  const winnerIsA = result.winRateA >= result.winRateB
  const sign = winnerIsA ? 1 : -1
  const winner = winnerIsA ? a : b
  const loser = winnerIsA ? b : a

  const tierDiff = Math.round(bd.tierDiffA * sign * 10) / 10
  const statDiff = Math.round(bd.statDiffA * sign * 10) / 10
  const haxNet = bd.haxNetA * sign
  const total = Math.round((tierDiff + statDiff + haxNet) * 10) / 10
  const winnerRate = Math.max(result.winRateA, result.winRateB)

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-300">
        🧾 산출 영수증 <span className="font-normal text-slate-500">· {winner.name} 기준</span>
      </h3>

      <Row
        label="체급(티어) 점수 차"
        value={`${fmt(tierDiff)}점`}
        v={tierDiff}
        sub={`${TIER_LABEL[winner.tier] ?? winner.tier} vs ${TIER_LABEL[loser.tier] ?? loser.tier}`}
      />
      <Row label="스탯 가중합 차" value={`${fmt(statDiff)}점`} v={statDiff} />
      <Row
        label="hax 상성 보정"
        value={`${fmt(haxNet)}p`}
        v={haxNet}
        sub={haxSummary(result, winnerIsA)}
      />

      {/* 합계 */}
      <div className="mt-1.5 flex items-baseline justify-between gap-2 border-t-2 border-slate-600 pt-2">
        <span className="text-sm font-bold text-slate-200">합계</span>
        <span className="font-mono text-sm font-bold tabular-nums text-slate-100">
          {fmt(total)}점 <span className="text-slate-500">→ 승률</span>{' '}
          <span style={{ color: COLOR_WIN }}>{winnerRate}%</span>
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        ※ 점수 합은 로지스틱 변환을 거쳐 승률로 환산되므로 승률(%)과 정확히 비례하진 않지만,
        합이 클수록 승률이 높아집니다.
      </p>
    </div>
  )
}
