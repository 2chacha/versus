import { COLOR_HAX, COLOR_NULLIFIED } from '../lib/constants'

/**
 * hax 알약 뱃지.
 * - 기본: 보라/네온 계열 + ⚡. "hax"라는 용어는 영어 그대로, label 은 번역 없이 그대로 노출.
 * - nullified: 이번 매치업에서 실제로 무효화된 hax만 빨간 경고 뱃지로. (엔진의 landed=false 데이터 재사용)
 * - 마우스 오버 시 title 로 전체 label 툴팁.
 */
export default function HaxBadge({ label, nullified = false }) {
  const short = label.split(' - ')[0]
  const color = nullified ? COLOR_NULLIFIED : COLOR_HAX
  return (
    <span
      title={label}
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
    </span>
  )
}
