import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import baseData from '../data/characters.json'
import { universeSortKey } from '../lib/constants'

const STORAGE_KEY = 'versus-nexus:v1'
// 기본(base) 캐릭터 데이터가 갱신될 때마다 올림 → 저장본과 버전이 다르면 기본 캐릭터를
// 최신 base JSON 으로 새로고침(신규 캐릭터·avatar·mechanism 등 새 필드가 반영되도록).
// 커스텀 캐릭터와 오버라이드는 버전이 바뀌어도 유지됨.
const DATA_VERSION = 6

const BASE_CHARACTERS = baseData.characters
const BASE_IDS = new Set(BASE_CHARACTERS.map((c) => c.id))

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

// 서버/외부 저장소 없음 → 사용자의 로스터/오버라이드는 localStorage 에 스냅샷으로 보관.
// 최초 로드 시 저장본이 있으면 그것을 진실로 삼고(=편집 반영), 없으면 base JSON 을 시드로 사용.
function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.characters)) {
        const overrides = Array.isArray(parsed.overrides) ? parsed.overrides : []
        if (parsed.dataVersion === DATA_VERSION) {
          // 동일 데이터 버전 → 저장본을 그대로 사용(사용자 편집 보존).
          return { characters: parsed.characters, overrides }
        }
        // 데이터 파일이 갱신됨(버전 불일치) → 기본 캐릭터는 최신 base JSON 으로 새로고침.
        // 사용자가 편집 UI로 추가한 커스텀 캐릭터(id가 'custom-'로 시작)만 유지하고,
        // base 에서 제거된 캐릭터(더 이상 BASE_IDS 에 없는 non-custom id)는 함께 삭제한다.
        // (기본 캐릭터에 가한 편집은 데이터 갱신 시 초기화됨 — "데이터를 덮어쓴다"는 의도에 맞춤.)
        const custom = parsed.characters.filter(
          (c) => !BASE_IDS.has(c.id) && String(c.id).startsWith('custom-'),
        )
        const characters = [...BASE_CHARACTERS.map(clone), ...custom]
        // 삭제된 캐릭터를 참조하던 오버라이드도 정리.
        const validIds = new Set(characters.map((c) => c.id))
        const cleanOverrides = overrides.filter((o) => validIds.has(o.a) && validIds.has(o.b))
        return { characters, overrides: cleanOverrides }
      }
    }
  } catch {
    // 파싱 실패 시 시드로 폴백
  }
  return { characters: clone(BASE_CHARACTERS), overrides: [] }
}

const RosterContext = createContext(null)

export function RosterProvider({ children }) {
  const initial = useMemo(loadInitial, [])
  const [characters, setCharacters] = useState(initial.characters)
  const [overrides, setOverrides] = useState(initial.overrides)

  // 변경분을 localStorage 로 영속화.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ characters, overrides, dataVersion: DATA_VERSION }),
      )
    } catch {
      // 저장 실패(사생활 모드 등)는 무시 — 현재 세션 동안은 정상 동작.
    }
  }, [characters, overrides])

  const addCharacter = useCallback((c) => {
    setCharacters((prev) => [...prev, c])
  }, [])

  const updateCharacter = useCallback((id, next) => {
    setCharacters((prev) => prev.map((c) => (c.id === id ? next : c)))
  }, [])

  const deleteCharacter = useCallback((id) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id))
    // 삭제된 캐릭터를 참조하는 오버라이드도 함께 제거.
    setOverrides((prev) => prev.filter((o) => o.a !== id && o.b !== id))
  }, [])

  // 기본 캐릭터를 base JSON 값으로 되돌림 (커스텀 캐릭터에는 해당 없음).
  const resetCharacter = useCallback((id) => {
    const original = BASE_CHARACTERS.find((c) => c.id === id)
    if (!original) return
    setCharacters((prev) => prev.map((c) => (c.id === id ? clone(original) : c)))
  }, [])

  // (a,b) 오버라이드 추가/갱신 — 순서 무관 중복 제거.
  const setOverride = useCallback((ov) => {
    setOverrides((prev) => {
      const rest = prev.filter(
        (o) => !((o.a === ov.a && o.b === ov.b) || (o.a === ov.b && o.b === ov.a)),
      )
      return [...rest, ov]
    })
  }, [])

  const deleteOverride = useCallback((aId, bId) => {
    setOverrides((prev) =>
      prev.filter(
        (o) => !((o.a === aId && o.b === bId) || (o.a === bId && o.b === aId)),
      ),
    )
  }, [])

  // 전체를 base JSON 시드로 초기화 (저장본 삭제).
  const resetAll = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // 무시
    }
    setCharacters(clone(BASE_CHARACTERS))
    setOverrides([])
  }, [])

  const value = useMemo(
    () => {
      // 캐릭터 리스트는 작품명(universe) 가나다순으로 노출 — 내부 상태 순서와 무관하게 모든 화면
      // (셀렉트/편집 목록/매트릭스 기본 순서)에서 일관 정렬. Array.sort 는 stable 이라 같은 작품
      // 내에서는 원래 데이터 순서(아크 순 등)를 유지함. 영문 작품명은 universeSortKey 로 한글 읽기
      // 매핑(JoJo→'죠죠')해서 ㅈ 차례에 들어가게 함.
      const sorted = [...characters].sort((a, b) =>
        universeSortKey(a.universe).localeCompare(universeSortKey(b.universe), 'ko'),
      )
      return {
        characters: sorted,
        overrides,
        byId: Object.fromEntries(sorted.map((c) => [c.id, c])),
        isBaseCharacter: (id) => BASE_IDS.has(id),
        addCharacter,
        updateCharacter,
        deleteCharacter,
        resetCharacter,
        setOverride,
        deleteOverride,
        resetAll,
      }
    },
    [
      characters,
      overrides,
      addCharacter,
      updateCharacter,
      deleteCharacter,
      resetCharacter,
      setOverride,
      deleteOverride,
      resetAll,
    ],
  )

  return <RosterContext.Provider value={value}>{children}</RosterContext.Provider>
}

export function useRoster() {
  const ctx = useContext(RosterContext)
  if (!ctx) throw new Error('useRoster must be used within <RosterProvider>')
  return ctx
}
