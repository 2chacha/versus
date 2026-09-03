// 태그 사전 (PRD §4). haxTraits[].type 와 resistances[] 가 공유하는 네임스페이스.
// 편집 UI의 드롭다운/체크박스 선택지로 사용.
export const TAGS = [
  { type: 'time_stop', label: '시간 정지' },
  { type: 'time_loop_reset', label: '사망 시점 되돌리기' },
  { type: 'causality_erasure', label: '인과 소거 (행동/존재 무효화)' },
  { type: 'universal_reset', label: '우주 리셋' },
  { type: 'instant_kill_conditional', label: '조건부 즉사' },
  { type: 'mental_domination', label: '정신지배/환술' },
  { type: 'space_cutting', label: '공간 절단/전이' },
  { type: 'domain_sure_hit', label: '영역전개 확정명중' },
  { type: 'reality_warping', label: '현실 왜곡' },
  { type: 'devil_fruit_nullify', label: '악마의 열매 무효화' },
  { type: 'haki_bypass', label: '패기 관통 (예약)' },
]

export const TAG_LABEL = Object.fromEntries(TAGS.map((t) => [t.type, t.label]))

// 티어 사다리 (가산점 순서). constants.TIER_LABEL 과 키를 공유.
export const TIERS = [
  'street',
  'city_block',
  'city',
  'country',
  'continent',
  'planet',
  'star',
  'universal',
  'multiversal',
]

export const STAT_KEYS = ['power', 'speed', 'durability', 'regeneration', 'battleIQ']
