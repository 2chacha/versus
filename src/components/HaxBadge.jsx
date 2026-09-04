import { COLOR_HAX, COLOR_NULLIFIED } from '../lib/constants'

// potency(10/15/20) → 채울 점 개수(1/2/3). 다른 값은 근사 매핑.
function potencyDots(potency) {
  if (potency >= 20) return 3
  if (potency >= 15) return 2
  return 1
}
function potencyLabel(potency) {
  if (potency >= 20) return '절대급'
  if (potency >= 15) return '강력'
  return '일반'
}

/**
 * hax 알약 뱃지.
 * - 기본: 보라/네온 계열 + ⚡. "hax"라는 용어는 영어 그대로, label 은 번역 없이 그대로 노출.
 * - nullified: 이번 매치업에서 실제로 무효화된 hax만 빨간 경고 뱃지로. (엔진의 landed=false 데이터 재사용)
 * - potency: 점 3개 중 위력만큼(10=1·15=2·20=3) 채워 등급 시각화. 툴팁에도 위력값 표기.
 */
export default function HaxBadge({ label, nullified = false, potency = 15 }) {
  const short = label.split(' - ')[0]
  const color = nullified ? COLOR_NULLIFIED : COLOR_HAX
  const filled = potencyDots(potency)
  return (
    <span
      title={`${label} (위력 potency ${potency} · ${potencyLabel(potency)})`}
      className="inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
      style={{
        color,
        borderColor: `${color}88`,
        backgroundColor: `${color}1f`,
      }}
    >
      <span aria-hidden>{nullified ? '⛔' : '⚡'}</span>
      <span className={'truncate ' + (nullified ? 'line-through decoration-red-400/70' : '')}>
        {short}
      </span>
      {nullified && <span className="shrink-0 not-italic">무효화</span>}
      {/* potency 등급 점 */}
      <span className="ml-0.5 flex shrink-0 items-center gap-[2px]" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-[5px] w-[5px] rounded-full"
            style={{
              backgroundColor: i < filled ? color : 'transparent',
              boxShadow: `inset 0 0 0 1px ${color}${i < filled ? '' : '66'}`,
            }}
          />
        ))}
      </span>
    </span>
  )
}
