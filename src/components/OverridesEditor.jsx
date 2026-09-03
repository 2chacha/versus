import { useMemo, useState } from 'react'
import { resolveMatchup } from '../lib/matchup'
import { COLOR_A, COLOR_B, COLOR_FOCUS } from '../lib/constants'
import { useRoster } from '../context/RosterContext'
import { CharacterSelect } from './CharacterSelect'

export default function OverridesEditor() {
  const { characters, overrides, byId, setOverride, deleteOverride } = useRoster()

  const [aId, setAId] = useState(characters[0]?.id ?? null)
  const [bId, setBId] = useState(characters[1]?.id ?? null)
  const [winRate, setWinRate] = useState('')
  const [note, setNote] = useState('')

  const charA = aId ? byId[aId] : null
  const charB = bId ? byId[bId] : null
  const samePair = aId && bId && aId === bId

  // 선택 쌍의 엔진 기본 승률(오버라이드 미적용).
  const engineWinRateA = useMemo(() => {
    if (!charA || !charB || samePair) return null
    return resolveMatchup(charA, charB, []).winRateA
  }, [charA, charB, samePair])

  function loadOverride(o) {
    setAId(o.a)
    setBId(o.b)
    setWinRate(String(o.winRateA))
    setNote(o.note ?? '')
  }

  function handleSave() {
    if (!aId || !bId || samePair) return
    const n = parseInt(winRate, 10)
    const clamped = Number.isNaN(n) ? (engineWinRateA ?? 50) : Math.max(0, Math.min(100, n))
    setOverride({ a: aId, b: bId, winRateA: clamped, note: note.trim() })
    setWinRate('')
    setNote('')
  }

  const inputCls =
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none'

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_1fr]">
      {/* 폼 */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="mb-1 text-sm font-bold text-slate-200">매치업 오버라이드</h2>
        <p className="mb-4 text-xs text-slate-500">
          엔진 결과를 무시하고 특정 매치업 승률을 수동 지정합니다. (팬덤 논쟁 매치업, 즉사기 vs 비인간 등)
        </p>

        <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <CharacterSelect value={aId} onChange={setAId} accent={COLOR_A} side="A" />
          <div className="text-center text-sm font-black text-slate-500">VS</div>
          <CharacterSelect value={bId} onChange={setBId} accent={COLOR_B} side="B" />
        </div>

        {samePair && (
          <div className="mt-3 text-xs text-rose-400">
            같은 캐릭터끼리는 오버라이드할 수 없습니다.
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">
              {charA?.name ?? 'A'} 승률 (%)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                className={inputCls + ' w-24 text-center'}
                value={winRate}
                onChange={(e) => setWinRate(e.target.value)}
                placeholder={engineWinRateA != null ? String(engineWinRateA) : '50'}
              />
              {engineWinRateA != null && (
                <button
                  type="button"
                  onClick={() => setWinRate(String(engineWinRateA))}
                  className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800"
                  title="엔진 기본값 넣기"
                >
                  엔진값 {engineWinRateA}%
                </button>
              )}
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">메모 (판정 리포트에 표시)</span>
            <input
              className={inputCls}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="예: 데스노트류 즉사 조건 성립 — 스탯 무시하고 즉결"
            />
          </label>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={!aId || !bId || samePair}
            className="rounded-lg bg-gradient-to-r from-sky-500 to-rose-500 px-4 py-2 text-sm font-bold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            오버라이드 저장
          </button>
        </div>
      </div>

      {/* 목록 */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="mb-3 text-sm font-bold text-slate-200">
          등록된 오버라이드 <span className="text-slate-500">({overrides.length})</span>
        </h2>
        {overrides.length === 0 ? (
          <div className="flex h-full min-h-[160px] items-center justify-center text-center text-sm text-slate-500">
            아직 오버라이드가 없습니다.
          </div>
        ) : (
          <ul className="space-y-2">
            {overrides.map((o) => {
              const a = byId[o.a]
              const b = byId[o.b]
              return (
                <li
                  key={`${o.a}|${o.b}`}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 text-sm">
                      <span style={{ color: COLOR_FOCUS }}>⚙ </span>
                      <span className="font-semibold text-slate-100">
                        {a?.name ?? o.a}
                      </span>
                      <span className="text-slate-500"> vs </span>
                      <span className="font-semibold text-slate-100">
                        {b?.name ?? o.b}
                      </span>
                      <span className="ml-2 tabular-nums text-slate-300">
                        → {a?.name ?? o.a} {o.winRateA}%
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => loadOverride(o)}
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                      >
                        편집
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteOverride(o.a, o.b)}
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  {o.note && (
                    <div className="mt-1 truncate text-xs text-slate-500">{o.note}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
