import { useEffect, useMemo, useRef, useState } from 'react'
import { useRoster } from '../context/RosterContext'
import { runTeamBattle, accumulatedFatigue } from '../lib/teamBattle'
import { useReveal } from '../lib/useReveal'
import { COLOR_A, COLOR_B, COLOR_GOLD, TIER_LABEL } from '../lib/constants'
import { CharacterSelect } from './CharacterSelect'
import FighterCard from './FighterCard'
import BreakdownReceipt from './BreakdownReceipt'
import Avatar from './Avatar'

// 팀 인원수 — 하드코딩 대신 상수. 슬롯 개수만 바꾸면 3v3 등으로 확장 가능(로직은 배열 길이로 처리).
const TEAM_SIZE = 2

const ANALYZE_MS = 800

// 소수점 첫째 자리 표기 (계산에 쓴 값 자체를 반올림해서만 표시 — 지어낸 수치 아님).
function fatiguePct(f) {
  return `${(f * 100).toFixed(1)}%`
}

function FatigueBadge({ fatigue, className = '' }) {
  if (!fatigue) return null
  return (
    <span
      title={`피로도 -${fatiguePct(fatigue)} (물리 스탯에만 적용, tier·potency 제외)`}
      className={
        'inline-flex items-center gap-1 rounded-full border border-amber-500/60 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300 ' +
        className
      }
    >
      🥵 피로 -{fatiguePct(fatigue)}
    </span>
  )
}

function TeamRoster({ label, accent, ids, byId, eliminatedIds, currentIds, accFat, isWinnerTeam, score, otherScore, showScore }) {
  return (
    <div
      className="rounded-2xl border bg-slate-900/40 p-3"
      style={{
        borderColor: isWinnerTeam ? COLOR_GOLD : `${accent}55`,
        boxShadow: isWinnerTeam ? `0 0 22px ${COLOR_GOLD}44` : 'none',
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-black" style={{ color: isWinnerTeam ? COLOR_GOLD : accent }}>
          {label}
          {isWinnerTeam && ' 👑'}
        </span>
        {showScore && (
          <span className="font-display text-lg font-black tabular-nums text-slate-100">{score}</span>
        )}
      </div>
      <ul className="space-y-1.5">
        {ids.map((id, i) => {
          const c = byId[id]
          if (!c) return null
          const elim = eliminatedIds.has(id)
          const current = currentIds.includes(id)
          const fat = accFat[id] || 0
          return (
            <li
              key={id}
              className={'flex items-center gap-2 rounded-lg px-2 py-1.5 transition ' + (current ? 'ring-1' : '')}
              style={current ? { boxShadow: `inset 0 0 0 1px ${accent}` } : undefined}
            >
              <span className="w-8 shrink-0 text-center text-[10px] font-bold text-slate-500">
                {i === 0 ? '선봉' : i === 1 ? '후공' : `${i + 1}번`}
              </span>
              <Avatar character={c} size={30} grayscale={elim} className="shrink-0 ring-1 ring-slate-700" />
              <span className={'min-w-0 flex-1 truncate text-sm ' + (elim ? 'text-slate-500 line-through' : 'text-slate-100')}>
                {c.name}
              </span>
              {fat > 0 && !elim && <FatigueBadge fatigue={fat} />}
              {elim && <span className="shrink-0 text-[11px] text-slate-600">탈락</span>}
              {current && !elim && <span className="shrink-0 text-[11px] font-bold" style={{ color: accent }}>출전</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function TeamBattle() {
  const { characters, byId } = useRoster()

  const [teamAIds, setTeamAIds] = useState(() => characters.slice(0, TEAM_SIZE).map((c) => c.id))
  const [teamBIds, setTeamBIds] = useState(() => characters.slice(TEAM_SIZE, TEAM_SIZE * 2).map((c) => c.id))
  const [phase, setPhase] = useState('setup') // setup | analyzing | result | done
  const [bracket, setBracket] = useState(null)
  const [matchIndex, setMatchIndex] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const reveal = useReveal(phase === 'result', matchIndex)

  function setSlot(team, idx, id) {
    if (team === 'A') setTeamAIds((prev) => prev.map((v, i) => (i === idx ? id : v)))
    else setTeamBIds((prev) => prev.map((v, i) => (i === idx ? id : v)))
  }
  function swapOrder(team) {
    if (team === 'A') setTeamAIds((prev) => [...prev].reverse())
    else setTeamBIds((prev) => [...prev].reverse())
  }

  const teamValid = (ids) =>
    ids.length === TEAM_SIZE && ids.every((id) => byId[id]) && new Set(ids).size === ids.length
  const canStart = teamValid(teamAIds) && teamValid(teamBIds)

  function startBattle() {
    if (!canStart) return
    const teamA = teamAIds.map((id) => byId[id])
    const teamB = teamBIds.map((id) => byId[id])
    const b = runTeamBattle(teamA, teamB)
    clearTimeout(timerRef.current)
    setBracket(b)
    setMatchIndex(0)
    setPhase('analyzing')
    timerRef.current = setTimeout(() => setPhase('result'), ANALYZE_MS)
  }
  function nextMatch() {
    clearTimeout(timerRef.current)
    setMatchIndex((i) => i + 1)
    setPhase('analyzing')
    timerRef.current = setTimeout(() => setPhase('result'), ANALYZE_MS)
  }
  function finish() {
    setPhase('done')
  }
  function resetBattle() {
    clearTimeout(timerRef.current)
    setBracket(null)
    setMatchIndex(0)
    setPhase('setup')
  }

  // 진행 상태 파생값
  const matches = bracket?.matches ?? []
  const resolvedCount =
    phase === 'setup' ? 0 : phase === 'analyzing' ? matchIndex : phase === 'result' ? matchIndex + 1 : matches.length
  const eliminatedIds = useMemo(() => {
    const s = new Set()
    for (let i = 0; i < resolvedCount && i < matches.length; i++) s.add(matches[i].loserId)
    return s
  }, [matches, resolvedCount])
  const accFat = useMemo(() => accumulatedFatigue(matches, resolvedCount), [matches, resolvedCount])
  const currentMatch = bracket && phase !== 'setup' && phase !== 'done' ? matches[matchIndex] : null
  const currentIds = currentMatch ? [currentMatch.rawA.id, currentMatch.rawB.id] : []
  const isLastMatch = matchIndex >= matches.length - 1

  // ===== SETUP =====
  if (phase === 'setup') {
    return (
      <div>
        <p className="mb-5 text-center text-sm text-slate-400">
          2:2 팀전 (서바이벌) — 선봉끼리 붙어 패자는 탈락, 승자는 상대 팀 다음 주자와 이어서 싸웁니다.
          연승할수록 접전이었을수록 <span className="text-amber-300">피로도</span>가 쌓입니다.
        </p>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {[
            { key: 'A', label: 'A팀', accent: COLOR_A, ids: teamAIds },
            { key: 'B', label: 'B팀', accent: COLOR_B, ids: teamBIds },
          ].map((team) => (
            <div key={team.key} className="rounded-2xl border bg-slate-900/40 p-4" style={{ borderColor: `${team.accent}55` }}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-black" style={{ color: team.accent }}>
                  {team.label}
                </h3>
                <button
                  type="button"
                  onClick={() => swapOrder(team.key)}
                  className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                >
                  ⇅ 순서 바꾸기
                </button>
              </div>
              <div className="space-y-3">
                {team.ids.map((id, i) => (
                  <div key={i}>
                    <div className="mb-1 text-[11px] font-bold text-slate-500">
                      {i === 0 ? '1번 · 선봉' : i === 1 ? '2번 · 후공' : `${i + 1}번`}
                    </div>
                    <CharacterSelect
                      value={id}
                      onChange={(v) => setSlot(team.key, i, v)}
                      accent={team.accent}
                      side={team.key}
                    />
                  </div>
                ))}
                {!teamValid(team.ids) && (
                  <p className="text-xs text-rose-400">같은 팀에 서로 다른 두 캐릭터를 선택하세요.</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={startBattle}
            disabled={!canStart}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-rose-500 px-8 py-3 text-base font-bold tracking-wide text-white shadow-lg shadow-rose-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ⚔️ TEAM BATTLE
          </button>
        </div>
      </div>
    )
  }

  // ===== 배틀/결과 공통: 팀 로스터 스트립 =====
  const roster = (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <TeamRoster
        label="A팀"
        accent={COLOR_A}
        ids={teamAIds}
        byId={byId}
        eliminatedIds={eliminatedIds}
        currentIds={currentIds}
        accFat={accFat}
        isWinnerTeam={phase === 'done' && bracket.winner === 'A'}
        score={bracket.scoreA}
        showScore={phase === 'done'}
      />
      <TeamRoster
        label="B팀"
        accent={COLOR_B}
        ids={teamBIds}
        byId={byId}
        eliminatedIds={eliminatedIds}
        currentIds={currentIds}
        accFat={accFat}
        isWinnerTeam={phase === 'done' && bracket.winner === 'B'}
        score={bracket.scoreB}
        showScore={phase === 'done'}
      />
    </div>
  )

  // ===== DONE: 최종 결과 =====
  if (phase === 'done') {
    const winLabel = bracket.winner === 'A' ? 'A팀' : 'B팀'
    return (
      <div>
        <div
          className="mb-6 rounded-2xl border-2 p-5 text-center"
          style={{ borderColor: COLOR_GOLD, boxShadow: `0 0 30px ${COLOR_GOLD}44` }}
        >
          <div className="text-xs uppercase tracking-widest text-slate-400">TEAM BATTLE 결과</div>
          <div className="mt-1 font-display text-3xl font-black" style={{ color: COLOR_GOLD }}>
            {winLabel} 승리 👑
          </div>
          <div className="mt-2 font-display text-xl font-black tabular-nums text-slate-100">
            <span style={{ color: COLOR_A }}>A팀 {bracket.scoreA}</span>
            <span className="mx-2 text-slate-500">:</span>
            <span style={{ color: COLOR_B }}>{bracket.scoreB} B팀</span>
          </div>
        </div>

        {roster}

        {/* 타임라인 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-300">매치 타임라인</h3>
          <ol className="space-y-2">
            {matches.map((m, i) => {
              const winnerName = m.aWins ? m.rawA.name : m.rawB.name
              const winnerColor = m.aWins ? COLOR_A : COLOR_B
              return (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-14 shrink-0 text-[11px] font-bold text-slate-500">매치 {i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-300">
                    {m.rawA.name} <span className="text-slate-600">vs</span> {m.rawB.name}
                  </span>
                  <span className="shrink-0 font-semibold" style={{ color: winnerColor }}>
                    ▶ {winnerName} {m.winnerRate}%
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={resetBattle}
            className="rounded-xl border border-slate-600 bg-slate-900/60 px-6 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-800"
          >
            ↺ 다시 편성
          </button>
        </div>
      </div>
    )
  }

  // ===== 매치 진행 (analyzing / result) =====
  const m = currentMatch
  const showResult = phase === 'result'
  const aWin = showResult ? Math.round(m.result.winRateA * reveal) : null
  const bWin = showResult ? Math.round(m.result.winRateB * reveal) : null

  return (
    <div>
      {roster}

      <div className="mb-3 text-center text-sm font-bold text-slate-400">
        매치 {matchIndex + 1} / 최대 {teamAIds.length + teamBIds.length - 1}
      </div>

      {/* 현재 매치 두 파이터 (피로 배지 + FighterCard 재사용) */}
      <div className="flex flex-col items-stretch gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-stretch sm:gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex min-h-[24px] items-center justify-center">
            <FatigueBadge fatigue={m.fatA} />
          </div>
          <FighterCard
            character={m.fighterA}
            side="A"
            state={showResult ? (m.aWins ? 'winner' : 'loser') : 'idle'}
            winRate={aWin}
            haxNotes={showResult ? m.result.aOnB.notes : null}
          />
        </div>
        <div className="flex items-center justify-center">
          <div
            className={'flex h-14 w-14 items-center justify-center rounded-full sm:h-16 sm:w-16 ' + (phase === 'analyzing' ? 'animate-pulse' : '')}
            style={{ background: 'radial-gradient(circle, #1e293b, #0b1220)', border: '2px solid #334155' }}
          >
            <span className="font-display bg-gradient-to-r from-sky-400 to-rose-400 bg-clip-text text-xl font-black text-transparent">
              VS
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex min-h-[24px] items-center justify-center">
            <FatigueBadge fatigue={m.fatB} />
          </div>
          <FighterCard
            character={m.fighterB}
            side="B"
            state={showResult ? (!m.aWins ? 'winner' : 'loser') : 'idle'}
            winRate={bWin}
            haxNotes={showResult ? m.result.bOnA.notes : null}
          />
        </div>
      </div>

      {/* 분석 중 연출 */}
      {phase === 'analyzing' && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="text-xs tracking-wide text-slate-400">전투 시뮬레이션 분석 중…</div>
          <div className="h-2 w-64 overflow-hidden rounded-full bg-slate-800">
            <div className="vn-analyze-bar h-full rounded-full" style={{ background: 'linear-gradient(90deg, #38bdf8, #fb7185)' }} />
          </div>
        </div>
      )}

      {/* 결과 공개 */}
      {showResult && (
        <section className="vn-reveal mt-6 space-y-5">
          <div className="overflow-hidden rounded-full border border-slate-700 bg-slate-900/60">
            <div className="flex h-3 w-full">
              <div style={{ width: `${m.result.winRateA * reveal}%`, backgroundColor: COLOR_A }} />
              <div style={{ width: `${m.result.winRateB * reveal}%`, backgroundColor: COLOR_B }} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <h2 className="mb-2 text-sm font-semibold text-slate-300">판정 리포트</h2>
              <p className="text-sm leading-relaxed text-slate-200">{m.report}</p>
            </div>
            <BreakdownReceipt result={m.result} a={m.fighterA} b={m.fighterB} />
          </div>

          <div className="flex justify-center">
            {isLastMatch ? (
              <button
                type="button"
                onClick={finish}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-8 py-3 text-base font-black text-slate-900 shadow-lg transition hover:brightness-110"
              >
                🏁 최종 결과 →
              </button>
            ) : (
              <button
                type="button"
                onClick={nextMatch}
                className="rounded-xl bg-gradient-to-r from-sky-500 to-rose-500 px-8 py-3 text-base font-bold text-white shadow-lg transition hover:brightness-110"
              >
                다음 매치 →
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
