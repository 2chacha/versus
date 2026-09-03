import { useMemo, useState } from 'react'
import { simulate, buildReport } from '../lib/battleEngine'
import { useRoster } from '../context/RosterContext'
import { TIER_LABEL, COLOR_WIN, COLOR_LOSE, universeColor } from '../lib/constants'
import Avatar from './Avatar'

const CELL = 30 // 셀 크기(px). 25~50명까지 대응하려 작게.
const ROWHEAD = 150 // 좌측 행 헤더 폭
const COLHEAD = 104 // 상단 열 헤더 높이

// 승률(0~100) → 색: 25↓ 크림슨 · 45~55 슬레이트 · 75↑ 에메랄드, 사이는 그라데이션.
function cellColor(w) {
  const C = [190, 30, 45] // crimson
  const S = [71, 85, 105] // slate
  const E = [16, 165, 120] // emerald
  const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
  let rgb
  if (w <= 25) rgb = C
  else if (w < 45) rgb = lerp(C, S, (w - 25) / 20)
  else if (w <= 55) rgb = S
  else if (w < 75) rgb = lerp(S, E, (w - 55) / 20)
  else rgb = E
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

function Legend() {
  const stops = [10, 25, 40, 50, 60, 75, 90]
  return (
    <div className="flex items-center gap-2 text-[11px] text-slate-400">
      <span>열세</span>
      <div className="flex overflow-hidden rounded">
        {stops.map((w) => (
          <div key={w} className="h-3 w-5" style={{ backgroundColor: cellColor(w) }} title={`${w}%`} />
        ))}
      </div>
      <span>우세</span>
      <span className="ml-1 text-slate-500">(셀 = 공격자의 승률 %)</span>
    </div>
  )
}

export default function NexusMatrix({ onOpenInArena }) {
  const { characters } = useRoster()
  const [sortByAvg, setSortByAvg] = useState(false)
  const [focusId, setFocusId] = useState(null)
  const [hovered, setHovered] = useState(null) // { type:'row'|'col', id }
  const [detail, setDetail] = useState(null) // { attackerId, defenderId }

  // ── 전체 매트릭스 계산 (캐싱: characters 참조가 안 바뀌면 재계산 안 함) ──
  const { rate, avg } = useMemo(() => {
    const rate = {} // rate[aId][dId] = a가 d를 공격했을 때 a의 승률 (simulate 재사용)
    for (const a of characters) {
      rate[a.id] = {}
      for (const d of characters) {
        rate[a.id][d.id] = a.id === d.id ? null : simulate(a, d).winRateA
      }
    }
    const avg = {}
    for (const a of characters) {
      const vals = characters.filter((d) => d.id !== a.id).map((d) => rate[a.id][d.id])
      avg[a.id] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
    }
    return { rate, avg }
  }, [characters])

  const byId = useMemo(() => Object.fromEntries(characters.map((c) => [c.id, c])), [characters])

  // 정렬: 기본(로스터 순) 또는 평균 승률 내림차순.
  const ordered = useMemo(() => {
    if (!sortByAvg) return characters
    return [...characters].sort((x, y) => avg[y.id] - avg[x.id])
  }, [characters, sortByAvg, avg])

  const focus = focusId ? byId[focusId] : null

  const easyPrey = useMemo(() => {
    if (!focus) return []
    return characters
      .filter((d) => d.id !== focus.id && rate[focus.id][d.id] >= 60)
      .map((d) => ({ d, w: rate[focus.id][d.id] }))
      .sort((a, b) => b.w - a.w)
  }, [focus, characters, rate])

  const hardCounters = useMemo(() => {
    if (!focus) return []
    return characters
      .filter((d) => d.id !== focus.id && rate[focus.id][d.id] <= 40)
      .map((d) => ({ d, w: rate[focus.id][d.id] }))
      .sort((a, b) => a.w - b.w)
  }, [focus, characters, rate])

  const detailData = useMemo(() => {
    if (!detail) return null
    const a = byId[detail.attackerId]
    const d = byId[detail.defenderId]
    if (!a || !d) return null
    const r = simulate(a, d)
    return { a, d, r, report: buildReport(a, d, r) }
  }, [detail, byId])

  const inHoverLine = (rowId, colId) =>
    hovered && ((hovered.type === 'col' && hovered.id === colId) || (hovered.type === 'row' && hovered.id === rowId))

  // ── 컨트롤 바 ──
  const controls = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {focus ? (
          <button
            type="button"
            onClick={() => setFocusId(null)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
          >
            ← 그리드로
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSortByAvg((v) => !v)}
            className={
              'rounded-lg border px-3 py-1.5 text-xs font-semibold transition ' +
              (sortByAvg
                ? 'border-sky-500 bg-sky-500/15 text-sky-300'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800')
            }
          >
            ▼ 평균 승률 순 정렬 {sortByAvg ? 'ON' : 'OFF'}
          </button>
        )}
      </div>
      <Legend />
    </div>
  )

  // ── 포커스 뷰 ──
  if (focus) {
    return (
      <div>
        {controls}
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <Avatar character={focus} size={56} className="ring-2" />
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">포커스</div>
            <div className="text-xl font-black text-slate-100">{focus.name}</div>
            <div className="text-xs text-slate-400">
              {focus.universe} · {TIER_LABEL[focus.tier] ?? focus.tier} · 평균 승률{' '}
              <span className="font-semibold text-slate-200">{Math.round(avg[focus.id])}%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <FocusList
            title="Easy Prey"
            subtitle="승률 60% 이상 (유리한 상대)"
            accent={COLOR_WIN}
            items={easyPrey}
            empty="승률 60% 이상인 상대가 없습니다."
            onPick={(d) => setDetail({ attackerId: focus.id, defenderId: d.id })}
            byId={byId}
          />
          <FocusList
            title="Hard Counters"
            subtitle="승률 40% 이하 (불리한 상대)"
            accent={COLOR_LOSE}
            items={hardCounters}
            empty="승률 40% 이하인 상대가 없습니다."
            onPick={(d) => setDetail({ attackerId: focus.id, defenderId: d.id })}
            byId={byId}
          />
        </div>

        {detailData && <DetailModal data={detailData} onClose={() => setDetail(null)} onOpenInArena={onOpenInArena} />}
      </div>
    )
  }

  // ── 그리드 뷰 ──
  const headBg = '#0b1220'
  return (
    <div>
      {controls}

      <div
        className="overflow-auto rounded-xl border border-slate-800"
        style={{ maxHeight: '72vh' }}
      >
        <table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              {/* 코너 */}
              <th
                className="sticky left-0 top-0 z-30 border-b border-r border-slate-700 text-[10px] text-slate-500"
                style={{ width: ROWHEAD, minWidth: ROWHEAD, height: COLHEAD, background: headBg }}
              >
                <div className="px-2 text-left leading-tight">
                  <div>수비자 ↓</div>
                  <div>공격자 →</div>
                </div>
              </th>
              {ordered.map((a) => {
                const active = hovered?.id === a.id
                return (
                  <th
                    key={a.id}
                    className="sticky top-0 z-20 cursor-pointer border-b border-r border-slate-800"
                    style={{
                      width: CELL,
                      minWidth: CELL,
                      height: COLHEAD,
                      background: active ? '#1e293b' : headBg,
                    }}
                    title={`${a.name} — 클릭: 포커스`}
                    onMouseEnter={() => setHovered({ type: 'col', id: a.id })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setFocusId(a.id)}
                  >
                    <div className="flex h-full flex-col items-center justify-end gap-1 pb-1">
                      <Avatar character={a} size={22} className="ring-1 ring-slate-600" />
                      <span
                        className="overflow-hidden text-[10px] text-slate-300"
                        style={{ writingMode: 'vertical-rl', maxHeight: COLHEAD - 34 }}
                      >
                        {a.name}
                      </span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {ordered.map((d) => {
              const rowActive = hovered?.id === d.id
              return (
                <tr key={d.id}>
                  {/* 행 헤더 */}
                  <th
                    className="sticky left-0 z-20 cursor-pointer border-b border-r border-slate-800 text-left"
                    style={{
                      width: ROWHEAD,
                      minWidth: ROWHEAD,
                      height: CELL,
                      background: rowActive ? '#1e293b' : headBg,
                    }}
                    title={`${d.name} — 클릭: 포커스`}
                    onMouseEnter={() => setHovered({ type: 'row', id: d.id })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setFocusId(d.id)}
                  >
                    <div className="flex items-center gap-1.5 px-2">
                      <Avatar character={d} size={20} className="shrink-0 ring-1 ring-slate-600" />
                      <span className="truncate text-[11px] font-medium text-slate-200">{d.name}</span>
                    </div>
                  </th>
                  {ordered.map((a) => {
                    const self = a.id === d.id
                    const w = self ? null : rate[a.id][d.id]
                    const dim = hovered && !inHoverLine(d.id, a.id)
                    return (
                      <td
                        key={a.id}
                        className="border-b border-r border-slate-900/60 text-center"
                        style={{
                          width: CELL,
                          minWidth: CELL,
                          height: CELL,
                          background: self ? '#1f2937' : cellColor(w),
                          opacity: dim ? 0.32 : 1,
                          cursor: self ? 'default' : 'pointer',
                        }}
                        onClick={self ? undefined : () => setDetail({ attackerId: a.id, defenderId: d.id })}
                        title={self ? '' : `${a.name} → ${d.name}: ${w}%`}
                      >
                        {self ? (
                          <span className="text-[10px] text-slate-600">—</span>
                        ) : (
                          <span
                            className="text-[10px] font-semibold tabular-nums text-white"
                            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                          >
                            {w}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        셀 클릭 = 1:1 상세 리포트 · 헤더 호버 = 라인 하이라이트 · 헤더 클릭 = 포커스 모드 ·{' '}
        {characters.length}명 · {characters.length * (characters.length - 1)}개 매치업
      </p>

      {detailData && <DetailModal data={detailData} onClose={() => setDetail(null)} onOpenInArena={onOpenInArena} />}
    </div>
  )
}

function FocusList({ title, subtitle, accent, items, empty, onPick, byId }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-1 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: accent }} />
        <h3 className="text-sm font-bold text-slate-100">{title}</h3>
        <span className="text-[11px] text-slate-500">({items.length})</span>
      </div>
      <p className="mb-3 text-xs text-slate-500">{subtitle}</p>
      {items.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-600">{empty}</div>
      ) : (
        <ul className="space-y-1.5">
          {items.map(({ d, w }) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onPick(d)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left transition hover:border-slate-700 hover:bg-slate-800/60"
              >
                <Avatar character={d} size={30} className="shrink-0 ring-1 ring-slate-700" />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{d.name}</span>
                <span
                  className="rounded px-1.5 py-0.5 text-xs font-bold tabular-nums"
                  style={{ color: accent, backgroundColor: `${accent}1f`, border: `1px solid ${accent}66` }}
                >
                  {w}%
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DetailModal({ data, onClose, onOpenInArena }) {
  const { a, d, r, report } = data
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="text-xs uppercase tracking-wide text-slate-500">1:1 판정 리포트</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Avatar character={a} size={44} className="ring-2 ring-sky-500/60" />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-100">{a.name}</div>
              <div className="text-[11px] text-slate-500">공격자</div>
            </div>
          </div>
          <div className="shrink-0 text-center">
            <div className="font-display text-2xl font-black text-slate-100 tabular-nums">
              {r.winRateA} : {r.winRateB}
            </div>
            <div className="text-[10px] text-slate-500">VS</div>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-100">{d.name}</div>
              <div className="text-[11px] text-slate-500">수비자</div>
            </div>
            <Avatar character={d} size={44} className="ring-2 ring-rose-500/60" />
          </div>
        </div>

        {/* 승률 바 */}
        <div className="mb-4 overflow-hidden rounded-full border border-slate-700">
          <div className="flex h-2.5 w-full">
            <div style={{ width: `${r.winRateA}%`, backgroundColor: '#38bdf8' }} />
            <div style={{ width: `${r.winRateB}%`, backgroundColor: '#fb7185' }} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-sm leading-relaxed text-slate-200">{report}</p>
        </div>

        <div className="mt-3 flex justify-between text-[11px] text-slate-500">
          <span>
            파워 {r.powerA} : {r.powerB}
          </span>
          {onOpenInArena && (
            <button
              type="button"
              onClick={() => {
                onOpenInArena(a.id, d.id)
                onClose()
              }}
              className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:bg-slate-800"
            >
              아레나에서 보기 ▶
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
