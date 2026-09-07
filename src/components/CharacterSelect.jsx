import { useEffect, useMemo, useRef, useState } from 'react'
import { TIER_LABEL } from '../lib/constants'
import { useRoster } from '../context/RosterContext'
import Avatar from './Avatar'

export function TierBadge({ tier }) {
  return (
    <span className="inline-block rounded border border-slate-600 bg-slate-800/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-300">
      {TIER_LABEL[tier] ?? tier}
    </span>
  )
}

/**
 * 검색 가능한 캐릭터 셀렉트.
 * - 버튼에 현재 선택 캐릭터(이름/작품/티어)를 표시
 * - 클릭하면 검색창 + 필터링되는 목록이 열림
 * - 바깥 클릭 / Esc 로 닫힘
 */
export function CharacterSelect({ value, onChange, accent, side }) {
  const { characters } = useRoster()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const boxRef = useRef(null)
  const inputRef = useRef(null)

  const selected = characters.find((c) => c.id === value) || null

  useEffect(() => {
    function onDocMouseDown(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) {
      // 터치 우선 기기(모바일/태블릿)에서는 열자마자 검색창에 포커스를 주지 않는다.
      // 자동 포커스 → 소프트 키보드가 화면 절반을 가리는 문제를 막기 위함.
      // 목록을 먼저 보고, 검색창을 직접 탭했을 때만 키보드가 뜬다.
      const coarsePointer =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(pointer: coarse)').matches
      if (!coarsePointer) inputRef.current.focus()
    }
    if (!open) setQuery('')
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return characters
    return characters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.universe.toLowerCase().includes(q),
    )
  }, [query, characters])

  return (
    <div ref={boxRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border bg-slate-900/70 px-4 py-3 text-left transition hover:bg-slate-800/70 focus:outline-none"
        style={{ borderColor: selected ? accent : '#334155' }}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {selected ? (
            <>
              <Avatar character={selected} size={36} className="shrink-0 ring-1 ring-slate-600" />
              <span className="min-w-0">
                <span className="block truncate text-lg font-bold text-slate-100">
                  {selected.name}
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className="truncate text-xs text-slate-400">
                    {selected.universe}
                  </span>
                  <TierBadge tier={selected.tier} />
                </span>
              </span>
            </>
          ) : (
            <span className="text-slate-400">
              {side === 'A' ? '왼쪽 파이터 선택' : '오른쪽 파이터 선택'}
            </span>
          )}
        </span>
        <span className="shrink-0 text-slate-500">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50">
          <div className="border-b border-slate-800 p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
              placeholder="이름 또는 작품 검색…"
              className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-500">
                검색 결과가 없습니다.
              </li>
            )}
            {filtered.map((c) => {
              const active = c.id === value
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c.id)
                      setOpen(false)
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-left hover:bg-slate-800"
                    style={active ? { backgroundColor: 'rgba(148,163,184,0.12)' } : undefined}
                  >
                    <Avatar character={c} size={32} className="shrink-0 ring-1 ring-slate-700" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-100">
                        {c.name}
                      </span>
                      <span className="truncate text-xs text-slate-400">
                        {c.universe}
                      </span>
                    </span>
                    <TierBadge tier={c.tier} />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
