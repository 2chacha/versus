import { useState } from 'react'
import { TIER_LABEL, UNIVERSE_COLOR } from '../lib/constants'
import { useRoster } from '../context/RosterContext'
import CharacterForm from './CharacterForm'

export default function RosterEditor() {
  const {
    characters,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    resetCharacter,
    isBaseCharacter,
  } = useRoster()

  const [editingId, setEditingId] = useState(null) // null | 'new' | <id>
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const editingInitial =
    editingId && editingId !== 'new'
      ? characters.find((c) => c.id === editingId) ?? null
      : null

  function handleSave(character) {
    if (editingId === 'new') addCharacter(character)
    else updateCharacter(editingId, character)
    setEditingId(null)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(0,1.1fr)]">
      {/* 목록 */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200">
            로스터 <span className="text-slate-500">({characters.length}명)</span>
          </h2>
          <button
            type="button"
            onClick={() => {
              setEditingId('new')
              setConfirmDeleteId(null)
            }}
            className="rounded-lg bg-gradient-to-r from-sky-500 to-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:brightness-110"
          >
            + 새 캐릭터
          </button>
        </div>

        <ul className="space-y-1.5">
          {characters.map((c) => {
            const base = isBaseCharacter(c.id)
            const active = editingId === c.id
            return (
              <li
                key={c.id}
                className={
                  'rounded-lg border px-3 py-2 ' +
                  (active ? 'border-slate-500 bg-slate-800/60' : 'border-slate-800 bg-slate-900/40')
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: UNIVERSE_COLOR[c.universe] ?? '#64748b' }}
                      />
                      <span className="truncate text-sm font-semibold text-slate-100">
                        {c.name}
                      </span>
                      <span
                        className={
                          'shrink-0 rounded px-1 text-[10px] ' +
                          (base
                            ? 'bg-slate-700/60 text-slate-400'
                            : 'bg-amber-500/20 text-amber-300')
                        }
                      >
                        {base ? '기본' : '커스텀'}
                      </span>
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {c.universe} · {TIER_LABEL[c.tier] ?? c.tier}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(c.id)
                        setConfirmDeleteId(null)
                      }}
                      className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      편집
                    </button>
                    {base && (
                      <button
                        type="button"
                        onClick={() => resetCharacter(c.id)}
                        title="이 캐릭터를 기본값으로 되돌리기"
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800"
                      >
                        되돌리기
                      </button>
                    )}
                    {confirmDeleteId === c.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            deleteCharacter(c.id)
                            if (editingId === c.id) setEditingId(null)
                            setConfirmDeleteId(null)
                          }}
                          className="rounded border border-rose-600 bg-rose-600/20 px-2 py-1 text-xs text-rose-300"
                        >
                          확인
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800"
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(c.id)}
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* 폼 */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        {editingId ? (
          <CharacterForm
            key={editingId}
            initial={editingInitial}
            onSave={handleSave}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center text-center text-sm text-slate-500">
            왼쪽에서 <span className="mx-1 text-slate-300">편집</span>을 누르거나
            <span className="mx-1 text-slate-300">+ 새 캐릭터</span>로
            <br />
            캐릭터를 추가/수정하세요.
          </div>
        )}
      </div>
    </div>
  )
}
