// 두 뷰(아레나 / 상성 맵)가 공유하는 표시용 상수.

// A = 왼쪽(시안), B = 오른쪽(로즈).
export const COLOR_A = '#38bdf8' // sky-400
export const COLOR_B = '#fb7185' // rose-400

// 상성 맵에서 우세/열세/포커스 표시에 쓰는 색.
export const COLOR_WIN = '#22c55e' // green-500 (포커스 캐릭터가 이기는 상대)
export const COLOR_LOSE = '#ef4444' // red-500  (포커스 캐릭터가 지는 상대)
export const COLOR_EVEN = '#94a3b8' // slate-400 (오차 범위)
export const COLOR_FOCUS = '#fbbf24' // amber-400 (선택된 캐릭터)

// 비주얼 폴리싱용.
export const COLOR_HAX = '#a78bfa' // violet-400 — hax 알약 뱃지
export const COLOR_NULLIFIED = '#ef4444' // red-500 — 이번 매치업에서 무효화된 hax
export const COLOR_GOLD = '#fbbf24' // WINNER 뱃지/글로우

export const TIER_LABEL = {
  street: 'Street',
  city_block: 'City Block',
  city: 'City',
  country: 'Country',
  continent: 'Continent',
  planet: 'Planet',
  star: 'Star',
  universal: 'Universal',
  multiversal: 'Multiversal',
}

// 티어별 컬러 (파워 램프) — 이미지 없는 캐릭터의 이니셜 플레이스홀더 배경, 티어 뱃지 강조에 사용.
export const TIER_COLOR = {
  street: '#6b7280', // gray
  city_block: '#22c55e', // green
  city: '#14b8a6', // teal
  country: '#0ea5e9', // sky
  continent: '#6366f1', // indigo
  planet: '#a855f7', // purple
  star: '#ec4899', // pink
  universal: '#f43f5e', // rose
  multiversal: '#f59e0b', // amber
}

// 레이더에 그릴 5대 스탯 (표시 순서 고정)
export const STAT_META = [
  { key: 'power', label: '파워' },
  { key: 'speed', label: '스피드' },
  { key: 'durability', label: '내구' },
  { key: 'regeneration', label: '재생' },
  { key: 'battleIQ', label: '전투지능' },
]

// 작품별 아이덴티티 컬러 (사용자 지정: JoJo=골드/앰버, 나루토=오렌지, 원피스=블루, 주술회전=바이올렛).
// characters.json 의 universe 문자열과 정확히 일치해야 함.
export const UNIVERSE_COLOR = {
  "JoJo's Bizarre Adventure": '#f59e0b', // gold / amber
  '나루토': '#f97316', // orange
  '원피스': '#3b82f6', // blue
  '주술회전': '#8b5cf6', // violet
  '블리치': '#22d3ee', // cyan
  '나의 히어로 아카데미아': '#84cc16', // lime
  '귀멸의 칼날': '#e11d48', // crimson
}

// 뱃지에 쓸 짧은 작품명.
export const UNIVERSE_SHORT = {
  "JoJo's Bizarre Adventure": 'JoJo',
  '나루토': '나루토',
  '원피스': '원피스',
  '주술회전': '주술회전',
  '블리치': '블리치',
  '나의 히어로 아카데미아': '히로아카',
  '귀멸의 칼날': '귀멸',
}

// 아바타 크롭 초점(object-position). 원본 이미지마다 얼굴 위치가 달라서
// 대부분 세로 상단(8~30%)에 얼굴이 오므로 캐릭터별로 조정. (실제 이미지 확인 후 튜닝)
// 값이 없으면 AVATAR_FOCUS_DEFAULT 사용.
export const AVATAR_FOCUS = {
  giorno_p5: '50% 20%',
  pucci_p6: '55% 12%',
  naruto: '50% 32%', // 가로 이미지 — 세로 크롭 없음
  sasuke: '50% 35%', // 가로 이미지 — 세로 크롭 없음
  madara: '50% 24%',
  luffy_g5: '50% 13%',
  kaido: '50% 14%',
  blackbeard: '50% 14%',
  gojo: '50% 9%',
  sukuna: '50% 20%',
  yuta: '50% 8%',
  // v0.3 추가 12명 (실제 이미지 확인 후 튜닝)
  itachi: '50% 38%', // 성인 아카츠키 이타치 — 가로 스크린샷
  jiraiya: '50% 13%', // 전신
  shanks: '50% 14%', // 앉은 전신
  ichigo: '50% 40%', // 얼굴 클로즈업
  aizen: '50% 30%', // 가로 클로즈업
  yhwach: '50% 42%', // 가로 클로즈업 (얼굴 하단)
  afo: '50% 10%', // 전신 (가면 상단)
  shigaraki: '50% 12%', // 전신
  deku: '50% 33%', // 머리 위 오라
  muzan: '52% 18%', // 소파 착석 (얼굴 약간 우측)
  yoriichi: '50% 42%', // 가로 클로즈업
  kokushibo: '62% 16%', // 얼굴이 우측 상단
  johnny: '50% 24%', // 죠니 죠스타 7부 — 얼굴 상단
}
export const AVATAR_FOCUS_DEFAULT = '50% 25%'

export function avatarFocus(id) {
  return AVATAR_FOCUS[id] ?? AVATAR_FOCUS_DEFAULT
}

// public 자산(아바타 이미지 등)의 절대경로("/characters/x.jpg")를 배포 base 에 맞게 보정.
// GitHub Pages 하위경로(/<repo>/) 배포에서도 이미지가 안 깨지도록 BASE_URL 을 앞에 붙임.
// 로컬(base '/')에서는 그대로 유지됨.
export function assetUrl(path) {
  if (!path) return path
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return base + path
}

export function universeColor(universe) {
  return UNIVERSE_COLOR[universe] ?? '#64748b'
}
export function universeShort(universe) {
  return UNIVERSE_SHORT[universe] ?? universe
}

// 작품명 가나다순 정렬용 키. 영문 작품명은 한글 읽기로 매핑해 ㄱ~ㅎ 사이 올바른 자리에 들어가게 함.
// (JoJo → '죠죠' → ㅈ 차례, '주술회전'보다 앞. 다른 작품은 이미 한글이라 그대로 사용.)
export const UNIVERSE_SORT_KEY = {
  "JoJo's Bizarre Adventure": '죠죠',
}
export function universeSortKey(universe) {
  return UNIVERSE_SORT_KEY[universe] ?? universe
}
