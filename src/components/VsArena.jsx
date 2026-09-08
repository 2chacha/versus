import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { resolveMatchup, buildReport } from '../lib/matchup'
import { buildDecidingFactors, buildCounterfactuals } from '../lib/battleEngine'
import { COLOR_A, COLOR_B, COLOR_FOCUS, STAT_META } from '../lib/constants'
import { useRoster } from '../context/RosterContext'
import { CharacterSelect } from './CharacterSelect'
import FighterCard from './FighterCard'
import BreakdownReceipt from './BreakdownReceipt'
import DecidingFactors from './DecidingFactors'

function VsEmblem({ analyzing }) {
  return (
    <div className="flex shrink-0 flex-col items-center justify-center px-0.5">
      <div
        className={'relative flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20 ' + (analyzing ? 'animate-pulse' : '')}
        style={{
          background: 'radial-gradient(circle, #1e293b, #0b1220)',
          border: '2px solid #334155',
          boxShadow: '0 0 26px rgba(56,189,248,0.32), inset 0 0 14px rgba(251,113,133,0.22)',
        }}
      >
        <span className="font-display bg-gradient-to-r from-sky-400 to-rose-400 bg-clip-text text-2xl font-black text-transparent sm:text-3xl">
          VS
        </span>
        <span className="absolute -top-2.5 text-lg" aria-hidden>⚡</span>
        <span className="absolute -bottom-2.5 text-sm" aria-hidden>🔥</span>
      </div>
    </div>
  )
}

function SummaryChip({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-100">{value}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </div>
  )
}

function ResultTabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-semibold transition ' +
        (active ? 'bg-slate-800 text-slate-100 shadow-inner' : 'text-slate-400 hover:text-slate-200')
      }
    >
      {children}
    </button>
  )
}

export default function VsArena({ aId, bId, onAChange, onBChange, simSignal }) {
  const { characters, overrides } = useRoster()
  const [phase, setPhase] = useState('idle') // idle | analyzing | done
  const [result, setResult] = useState(null)
  const [reveal, setReveal] = useState(0) // 0→1 카운트업 진행도 (승률 숫자/바 차오름)
  const [resultTab, setResultTab] = useState('summary') // summary | factors
  const timerRef = useRef(null)
  const pendingRef = useRef(null)
  const rafRef = useRef(null)

  const charA = characters.find((c) => c.id === aId) || null
  const charB = characters.find((c) => c.id === bId) || null
  const canSimulate = !!charA && !!charB

  // 선택이 바뀌면 결과/연출 초기화 → 히어로 카드가 항상 현재 선택을 반영.
  useEffect(() => {
    setPhase('idle')
    setResult(null)
  }, [aId, bId])

  function runSimulation() {
    if (!charA || !charB) return
    clearTimeout(timerRef.current)
    const r = resolveMatchup(charA, charB, overrides)
    const report = r.overridden ? '' : buildReport(charA, charB, r)
    pendingRef.current = { r, report, a: charA, b: charB }
    setResult(null)
    setPhase('analyzing')
    // 결과를 바로 공개하지 않고 ~0.75초 분석 연출 후 공개 (연속 테스트 위해 0.8초 미만 유지).
    timerRef.current = setTimeout(() => {
      setResult(pendingRef.current)
      setPhase('done')
    }, 750)
  }

  // 상성 맵에서 "아레나에서 보기"로 넘어오면 simSignal 증가 → 자동 시뮬.
  useEffect(() => {
    if (simSignal > 0 && charA && charB) runSimulation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simSignal])

  // 랜덤 대결: 서로 다른 두 명을 뽑아 슬롯만 채움(자동 시뮬 안 함).
  function randomMatchup() {
    if (characters.length < 2) return
    const i = Math.floor(Math.random() * characters.length)
    let j = Math.floor(Math.random() * (characters.length - 1))
    if (j >= i) j += 1
    onAChange(characters[i].id)
    onBChange(characters[j].id)
  }

  const done = phase === 'done' && !!result

  // 새 결과가 나오면 항상 "승률 요약" 탭부터 보여줌.
  useEffect(() => {
    setResultTab('summary')
  }, [result])

  // 판정 근거 블록 데이터 — 오버라이드 매치업은 엔진 계산과 승률이 달라 근거 블록을 만들지 않음.
  // ⚠️ 두 빌더 모두 엔진이 계산한 값만 구조화해서 반환함(프론트에서 서술을 지어내지 않음).
  const decidingData = useMemo(
    () => (done && !result.r.overridden ? buildDecidingFactors(result.a, result.b, result.r) : null),
    [done, result],
  )
  const counterfactuals = useMemo(
    () => (done && !result.r.overridden ? buildCounterfactuals(result.a, result.b) : null),
    [done, result],
  )

  // 결과 공개 순간 승률 0→최종 카운트업 (약 0.5초, easeOutCubic). 결과가 바뀔 때마다 재생.
  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    if (!done) {
      setReveal(0)
      return
    }
    const start = performance.now()
    const dur = 520
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur)
      setReveal(1 - Math.pow(1 - t, 3))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    // rAF 는 백그라운드 탭에서 멈추므로, 최종값은 setTimeout 으로도 보장(중간에 탭 전환해도 결과가 0에 갇히지 않음).
    const settle = setTimeout(() => setReveal(1), dur + 80)
    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(settle)
    }
  }, [done, result])

  // 언마운트 시 타이머/애니메이션 정리.
  useEffect(() => () => {
    clearTimeout(timerRef.current)
    cancelAnimationFrame(rafRef.current)
  }, [])

  const displayWinnerIsA = done ? result.r.winRateA >= result.r.winRateB : true

  const aState = done ? (displayWinnerIsA ? 'winner' : 'loser') : 'idle'
  const bState = done ? (!displayWinnerIsA ? 'winner' : 'loser') : 'idle'
  const aWin = done ? Math.round(result.r.winRateA * reveal) : null
  const bWin = done ? Math.round(result.r.winRateB * reveal) : null
  const aNotes = done ? result.r.aOnB.notes : null
  const bNotes = done ? result.r.bOnA.notes : null

  const radarData = useMemo(() => {
    if (!result) return []
    return STAT_META.map((s) => ({
      stat: s.label,
      A: result.a.stats[s.key],
      B: result.b.stats[s.key],
      fullMark: 10,
    }))
  }, [result])

  const engineWinnerIsA = done ? result.r.engineWinRateA >= 50 : true
  const winnerNet = done ? (engineWinnerIsA ? result.r.netModifier : -result.r.netModifier) : 0
  const powerDiff = done ? Math.round(Math.abs(result.r.powerA - result.r.powerB) * 10) / 10 : 0
  const engineWinRateA = done ? result.r.engineWinRateA : 0

  return (
    <div>
      {/* ===== 히어로: 캐릭터 셀렉트 카드 ===== */}
      <section>
        {/* 모바일: 세로 스택(카드 A / VS / 카드 B). sm 이상: 3열 그리드(기존 PC 레이아웃). */}
        <div className="flex flex-col items-stretch gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-stretch sm:gap-4">
          <FighterCard character={charA} side="A" state={aState} winRate={aWin} haxNotes={aNotes} />
          <VsEmblem analyzing={phase === 'analyzing'} />
          <FighterCard character={charB} side="B" state={bState} winRate={bWin} haxNotes={bNotes} />
        </div>

        {/* 셀렉트 (카드 아래) — 모바일 세로 스택, sm 이상 3열 */}
        <div className="mt-4 flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4">
          <CharacterSelect value={aId} onChange={onAChange} accent={COLOR_A} side="A" />
          <div className="hidden sm:block sm:w-20" />
          <CharacterSelect value={bId} onChange={onBChange} accent={COLOR_B} side="B" />
        </div>

        {/* SIMULATE + 랜덤 + 분석 연출 */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={runSimulation}
              disabled={!canSimulate || phase === 'analyzing'}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-rose-500 px-8 py-3 text-base font-bold tracking-wide text-white shadow-lg shadow-rose-500/20 transition hover:brightness-110 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            >
              ⚔️ SIMULATE BATTLE
            </button>
            <button
              type="button"
              onClick={randomMatchup}
              disabled={phase === 'analyzing' || characters.length < 2}
              title="무작위로 두 캐릭터를 슬롯에 채웁니다 (시뮬레이션은 직접 실행)"
              className="rounded-xl border border-slate-600 bg-slate-900/60 px-5 py-3 text-base font-bold text-slate-200 transition hover:bg-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            >
              🎲 랜덤 대결
            </button>
          </div>

          {!canSimulate && phase !== 'analyzing' && (
            <p className="text-center text-xs text-slate-400">
              양쪽 슬롯에서 캐릭터를 선택하면{' '}
              <span className="font-semibold text-slate-200">SIMULATE</span> 가 활성화됩니다.
              <span className="text-slate-600"> (🎲 랜덤 대결로 자동 편성도 가능)</span>
            </p>
          )}

          {phase === 'analyzing' && (
            <div className="w-64">
              <div className="mb-1 text-center text-xs tracking-wide text-slate-400">
                전투 시뮬레이션 분석 중…
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="vn-analyze-bar h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #38bdf8, #fb7185)' }}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== 결과 ===== */}
      {done && (
        <section className="vn-reveal mt-8 space-y-6">
          {/* 승률 바 — 결과 공개 시 reveal(0→1)에 맞춰 채워짐 */}
          <div className="overflow-hidden rounded-full border border-slate-700 bg-slate-900/60">
            <div className="flex h-3 w-full">
              <div style={{ width: `${result.r.winRateA * reveal}%`, backgroundColor: COLOR_A }} />
              <div style={{ width: `${result.r.winRateB * reveal}%`, backgroundColor: COLOR_B }} />
            </div>
          </div>

          {/* 결과 탭 — 오버라이드 매치업은 엔진 계산과 승률이 어긋나므로 "판정 근거" 탭을 노출하지 않음 */}
          {!result.r.overridden && (
            <div className="flex justify-center">
              <div className="inline-flex flex-wrap justify-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
                <ResultTabButton active={resultTab === 'summary'} onClick={() => setResultTab('summary')}>
                  📊 승률 요약
                </ResultTabButton>
                <ResultTabButton active={resultTab === 'factors'} onClick={() => setResultTab('factors')}>
                  ⚖️ 판정 근거
                </ResultTabButton>
              </div>
            </div>
          )}

          {/* ===== 탭: 승률 요약 (오버라이드일 땐 탭 없이 이 내용만) ===== */}
          {(resultTab === 'summary' || result.r.overridden) && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-300">스탯 비교</h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="stat" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 10]}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickCount={6}
                    />
                    <Radar name={result.a.name} dataKey="A" stroke={COLOR_A} fill={COLOR_A} fillOpacity={0.35} />
                    <Radar name={result.b.name} dataKey="B" stroke={COLOR_B} fill={COLOR_B} fillOpacity={0.35} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#cbd5e1' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {result.r.overridden ? (
                <div
                  className="rounded-2xl border bg-slate-900/40 p-4"
                  style={{ borderColor: `${COLOR_FOCUS}66` }}
                >
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: COLOR_FOCUS }}>
                    ⚙️ 수동 오버라이드된 매치업
                  </h2>
                  <p className="text-sm leading-relaxed text-slate-200">
                    {result.r.overrideNote || '지정된 메모가 없습니다.'}
                  </p>
                  <p className="mt-3 border-t border-slate-800 pt-2 text-xs text-slate-500">
                    엔진 기본 계산값: {result.a.name} {engineWinRateA}% · {result.b.name}{' '}
                    {100 - engineWinRateA}% (오버라이드로 대체됨)
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
                  <h2 className="mb-3 text-sm font-semibold text-slate-300">판정 리포트</h2>
                  <p className="text-sm leading-relaxed text-slate-200">{result.report}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <SummaryChip
                  label="파워 스코어"
                  value={`${result.r.powerA} : ${result.r.powerB}`}
                  sub={`격차 ${powerDiff}p`}
                />
                {result.r.overridden ? (
                  <SummaryChip label="판정 방식" value="수동 지정" sub={`엔진 기본 ${engineWinRateA}%`} />
                ) : (
                  <SummaryChip
                    label="hax 순보정"
                    value={`${winnerNet >= 0 ? '+' : ''}${winnerNet}p`}
                    sub="승자 기준"
                  />
                )}
                <SummaryChip
                  label="예측 승자"
                  value={displayWinnerIsA ? result.a.name : result.b.name}
                  sub={`${Math.max(result.r.winRateA, result.r.winRateB)}%`}
                />
              </div>

              {/* 산출 영수증 — 오버라이드가 아닐 때만 (오버라이드는 수동 지정이라 점수 합산과 무관) */}
              {!result.r.overridden && (
                <BreakdownReceipt result={result.r} a={result.a} b={result.b} />
              )}
            </div>
          </div>
          )}

          {/* ===== 탭: 판정 근거 (Deciding Factors) ===== */}
          {resultTab === 'factors' && !result.r.overridden && (
            <DecidingFactors
              data={decidingData}
              cf={counterfactuals}
              a={result.a}
              b={result.b}
            />
          )}
        </section>
      )}
    </div>
  )
}
