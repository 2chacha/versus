import { useState } from 'react'
import { TAGS, TAG_LABEL, TIERS, STAT_KEYS } from '../lib/tags'
import { TIER_LABEL, STAT_META } from '../lib/constants'

const STAT_LABEL = Object.fromEntries(STAT_META.map((s) => [s.key, s.label]))

function clampNum(v) {
  const n = parseFloat(v)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(10, n))
}

/**
 * 캐릭터 추가/편집 공용 폼.
 * 부모가 key={editingId} 로 렌더해 초기값이 바뀔 때 자동 리마운트 되도록 함.
 */
export default function CharacterForm({ initial, onSave, onCancel }) {
  const isNew = !initial
  const [name, setName] = useState(initial?.name ?? '')
  const [universe, setUniverse] = useState(initial?.universe ?? '')
  const [arc, setArc] = useState(initial?.arc ?? '-')
  const [tier, setTier] = useState(initial?.tier ?? 'country')
  const [stats, setStats] = useState(() =>
    Object.fromEntries(STAT_KEYS.map((k) => [k, String(initial?.stats?.[k] ?? 5)])),
  )
  const [haxTraits, setHaxTraits] = useState(() =>
    (initial?.haxTraits ?? []).map((t) => ({ type: t.type, label: t.label })),
  )
  const [resistances, setResistances] = useState(() => [...(initial?.resistances ?? [])])
  const [error, setError] = useState('')

  function setStat(k, v) {
    setStats((prev) => ({ ...prev, [k]: v }))
  }

  function addTrait() {
    setHaxTraits((prev) => [...prev, { type: TAGS[0].type, label: '' }])
  }
  function updateTrait(i, patch) {
    setHaxTraits((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  }
  function removeTrait(i) {
    setHaxTraits((prev) => prev.filter((_, idx) => idx !== i))
  }

  function toggleResistance(type) {
    setResistances((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    )
  }

  function handleSave() {
    if (!name.trim()) {
      setError('이름을 입력하세요.')
      return
    }
    const character = {
      id: initial?.id ?? `custom-${Date.now()}`,
      name: name.trim(),
      universe: universe.trim() || '커스텀',
      arc: arc.trim() || '-',
      tier,
      stats: Object.fromEntries(STAT_KEYS.map((k) => [k, clampNum(stats[k])])),
      haxTraits: haxTraits
        .filter((t) => t.type)
        .map((t) => ({ type: t.type, label: t.label.trim() || TAG_LABEL[t.type] })),
      resistances: [...new Set(resistances)],
    }
    onSave(character)
  }

  const inputCls =
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-200">
          {isNew ? '새 캐릭터 추가' : `편집: ${initial.name}`}
        </h3>
        {!isNew && (
          <span className="text-[11px] text-slate-500">id: {initial.id}</span>
        )}
      </div>

      {/* 기본 정보 */}
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 block">
          <span className="mb-1 block text-xs text-slate-400">이름 *</span>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">작품(universe)</span>
          <input
            className={inputCls}
            value={universe}
            onChange={(e) => setUniverse(e.target.value)}
            placeholder="예: 주술회전"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">아크(arc)</span>
          <input className={inputCls} value={arc} onChange={(e) => setArc(e.target.value)} />
        </label>
        <label className="col-span-2 block">
          <span className="mb-1 block text-xs text-slate-400">티어</span>
          <select className={inputCls} value={tier} onChange={(e) => setTier(e.target.value)}>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {TIER_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 스탯 */}
      <div>
        <div className="mb-1 text-xs text-slate-400">스탯 (0–10)</div>
        <div className="grid grid-cols-5 gap-2">
          {STAT_KEYS.map((k) => (
            <label key={k} className="block">
              <span className="mb-1 block text-center text-[11px] text-slate-500">
                {STAT_LABEL[k]}
              </span>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                className={inputCls + ' text-center'}
                value={stats[k]}
                onChange={(e) => setStat(k, e.target.value)}
              />
            </label>
          ))}
        </div>
      </div>

      {/* haxTraits */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-slate-400">haxTraits (공격/유틸형 특수능력)</span>
          <button
            type="button"
            onClick={addTrait}
            className="rounded border border-slate-600 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            + 특성 추가
          </button>
        </div>
        <div className="space-y-2">
          {haxTraits.length === 0 && (
            <div className="text-[11px] text-slate-600">등록된 특성 없음</div>
          )}
          {haxTraits.map((t, i) => (
            <div key={i} className="flex gap-2">
              <select
                className={inputCls + ' max-w-[45%]'}
                value={t.type}
                onChange={(e) => updateTrait(i, { type: e.target.value })}
              >
                {TAGS.map((tag) => (
                  <option key={tag.type} value={tag.type}>
                    {tag.label}
                  </option>
                ))}
              </select>
              <input
                className={inputCls}
                value={t.label}
                onChange={(e) => updateTrait(i, { label: e.target.value })}
                placeholder="설명 라벨 (예: 무량공처 - 확정 명중)"
              />
              <button
                type="button"
                onClick={() => removeTrait(i)}
                className="shrink-0 rounded border border-slate-700 px-2 text-slate-400 hover:bg-slate-800"
                title="삭제"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* resistances */}
      <div>
        <div className="mb-1 text-xs text-slate-400">resistances (방어/무효화형 저항)</div>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => {
            const on = resistances.includes(tag.type)
            return (
              <button
                key={tag.type}
                type="button"
                onClick={() => toggleResistance(tag.type)}
                className={
                  'rounded-full border px-2.5 py-1 text-xs transition ' +
                  (on
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-700 text-slate-400 hover:bg-slate-800')
                }
              >
                {tag.label}
              </button>
            )
          })}
        </div>
      </div>

      {error && <div className="text-xs text-rose-400">{error}</div>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-gradient-to-r from-sky-500 to-rose-500 px-4 py-2 text-sm font-bold text-white hover:brightness-110"
        >
          저장
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          취소
        </button>
      </div>
    </div>
  )
}
