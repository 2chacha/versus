import { COLOR_A, COLOR_B } from '../lib/constants'

// 판정 근거(Deciding Factors) — 결과 화면 하위 블록.
// ⚠️ 여기 나오는 모든 문구/숫자는 buildDecidingFactors() / buildCounterfactuals() 가 엔진 계산으로
//    반환한 값만 그대로 렌더한다. 프론트에서 새 설명·추정 문장을 만들지 않음 (텍스트/계산 일치 원칙).

// badge 문자열 → 색상 (요청 스펙: 우세=초록, 열세/제약=주황, 무효=회색, 패자 쪽 적중=빨강)
const BADGE_STYLE = {
  우세: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  '승자 방어 성공': 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  열세: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  제약: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  '무효(전제조건 불충족)': 'border-slate-600 bg-slate-700/40 text-slate-300',
  '패자 쪽 적중(견제 요인)': 'border-rose-500/40 bg-rose-500/15 text-rose-300',
}
function badgeStyle(badge) {
  return BADGE_STYLE[badge] || 'border-slate-600 bg-slate-700/40 text-slate-300'
}

function fmtDelta(d) {
  if (d === 0) return '±0p'
  return `${d > 0 ? '+' : ''}${d}p`
}

/**
 * @param data buildDecidingFactors() 반환값 { factors, confirmedPremises, remainingUncertainties, appliedPrinciple }
 * @param cf   buildCounterfactuals() 반환값 { base, branches }
 * @param a,b  아레나의 charA/charB (분기 승률 표기용 이름)
 */
export default function DecidingFactors({ data, cf, a, b }) {
  if (!data) return null
  const { factors, confirmedPremises, remainingUncertainties, appliedPrinciple } = data
  const branches = cf?.branches ?? []

  return (
    <div className="space-y-5">
      {/* 1) DECIDING FACTORS 카드 목록 */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="mb-1 text-sm font-semibold text-slate-300">⚖️ 판정 근거 (Deciding Factors)</h3>
        <p className="mb-3 text-[11px] leading-snug text-slate-500">
          엔진이 실제로 계산한 요인만 그대로 나열합니다 (추정·서술 없음).
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {factors.map((f, i) => (
            <div key={i} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <span className="text-sm font-semibold leading-snug text-slate-100">{f.title}</span>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeStyle(f.badge)}`}
                >
                  {f.badge}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">{f.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 2) 확인된 전제 / 남은 불확실성 (좌우 2단) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <span aria-hidden>🛡️</span> 확인된 전제
          </h3>
          <ul className="space-y-1.5">
            {confirmedPremises.map((p, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                <span className="mt-0.5 shrink-0 text-emerald-500/70" aria-hidden>•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-300">
            <span aria-hidden>⚠️</span> 남은 불확실성
          </h3>
          <ul className="space-y-1.5">
            {remainingUncertainties.map((u, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                <span className="mt-0.5 shrink-0 text-amber-500/70" aria-hidden>•</span>
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3) 조건별 판정 분기 — 실제 재계산 결과 */}
      {branches.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="mb-1 text-sm font-semibold text-slate-300">🔀 조건별 판정 분기</h3>
          <p className="mb-3 text-[11px] leading-snug text-sky-300/80">
            실제 엔진으로 다시 계산한 가정 시나리오입니다 (지어낸 값이 아니라 hax 결과를 뒤집어 재시뮬레이션한 승률).
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {branches.map((br, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <p className="mb-1.5 text-xs font-medium leading-snug text-slate-200">{br.label}</p>
                <p className="font-mono text-sm tabular-nums text-slate-100">
                  → {a.name} <span style={{ color: COLOR_A }}>{br.winRateA}%</span>
                  {' / '}
                  {b.name} <span style={{ color: COLOR_B }}>{br.winRateB}%</span>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  실제 대비 {a.name}{' '}
                  <span className={br.deltaA > 0 ? 'text-emerald-400' : br.deltaA < 0 ? 'text-rose-400' : 'text-slate-400'}>
                    {fmtDelta(br.deltaA)}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4) 이번 판정에 적용한 원칙 (각주) */}
      <p className="rounded-xl border border-slate-800/60 bg-slate-950/40 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
        <span className="font-semibold text-slate-400">이번 판정에 적용한 원칙 · </span>
        {appliedPrinciple}
      </p>
    </div>
  )
}
