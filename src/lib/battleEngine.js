// Versus Nexus — 확정 계산 엔진
// battle-engine-reference.js 에서 "로직 변경 없이" 포팅한 것.
// 원본과의 차이는 다음뿐:
//   1) Node의 fs/path 로 characters.json 을 읽던 부분 제거 (프론트에서 import 로 주입)
//   2) 전체 매치업을 돌려 results.md 를 쓰던 실행 스크립트 부분 제거
//   3) simulate / buildReport / buildDecidingFactors / buildCounterfactuals 를 ES module 로 export
// 파워 스코어 / hax 순보정 / 로지스틱 승률 계산식은 원본과 100% 동일.
//
// ⚠️ 의도적 유지(레퍼런스와 딱 한 군데 다른 점): buildReport 의 "같은 태그 클래시" 서술에서
//    레퍼런스는 potency가 동급이면 "최종 헤스 순보정은 0p"라고 하드코딩하지만, 그 클래시 외의
//    다른 특성 때문에 실제 netModifier(winnerNet)는 0이 아닐 수 있음(예: gojo vs sukuna).
//    그 경우 리포트 텍스트가 산출 영수증의 "hax 순보정" 칩과 어긋나므로(텍스트/계산 불일치),
//    여기서는 항상 실제 winnerNet 을 사용함. (과거 확인된 버그 — 재도입 방지)

// ---- 설계 확정값 ----
// 티어는 곱셈이 아니라 "가산 점수"로 반영 (곱셈이면 헤스 보정이 절대 못 따라가는 문제가 있었음)
const TIER_SCORE = {
  street: 0,
  city_block: 10,
  city: 20,
  country: 35,
  continent: 45,
  planet: 55,
  star: 65,
  universal: 75,
  multiversal: 85,
}

const STAT_WEIGHTS = { power: 1.2, speed: 1.0, durability: 1.0, regeneration: 0.8, battleIQ: 0.6 }
// v1.4: 헤스 위력을 태그당 균일한 +15로 두지 않고 특성별 potency(10/일반, 15/강력, 20/절대급)를 그대로 사용.
// 이유: 서로 무관한 헤스끼리 둘 다 적중하면 예전엔 항상 +15=+15로 완전히 상쇄돼서(전체 매치업의 43%가 순보정 0),
// "절대급 능력이든 보조 능력이든 적중만 하면 다 똑같다"는 게 부자연스럽다는 지적을 반영해 potency로 세분화함.
const DEFAULT_POTENCY = 15 // potency 필드가 없는 특성에 대한 폴백
const RESIST_DAMPEN_RATIO = 0.3 // 저항당해도 완전 무효(0)가 아니라 potency의 30%는 견제 효과로 남김
const MODIFIER_CAP = 30 // 헤스 보정 총합 상한 (특성 개수로 무한정 커지는 것 방지)
const SCALE_FACTOR = 25 // 로지스틱 변환 스케일 — 1티어차(~15pt)는 헤스로 역전 가능, 2티어차(~35pt+)는 사실상 불가하도록 튜닝

function statScore(stats) {
  return Object.entries(STAT_WEIGHTS).reduce((sum, [k, w]) => sum + stats[k] * w, 0)
}

function powerScore(c) {
  return statScore(c.stats) + TIER_SCORE[c.tier]
}

// A의 haxTraits가 B에게 얼마나 먹히는지 단방향 계산
// v1.8: overrides로 특정 태그의 적중/저항 결과를 강제할 수 있음 — "조건별 판정 분기"(반사실 재계산) UI에서
// "이 hax가 실제와 반대로 저항/적중했다면?"을 실제로 다시 시뮬레이션하기 위해 씀. 전제조건 불충족(notApplicable)은
// 오버라이드 대상이 아님 — 이건 확률적 저항이 아니라 "애초에 적용 대상이 아니다"라는 사실이라 뒤집을 수 없음.
function oneSidedHax(attacker, defender, overrides = {}) {
  let total = 0
  const notes = []
  for (const trait of attacker.haxTraits) {
    const potency = trait.potency || DEFAULT_POTENCY
    // v1.7: 일부 hax는 상대가 특정 전제조건(예: 악마의 열매 능력자)을 충족해야만 애초에 적용 대상이 됨.
    // 이걸 체크 안 하면 "블랙비어드의 야미야미 열매(악마의 열매 능력 무효화)가 악마의 열매와 무관한
    // 상대(예: 귀멸의 칼날 코쿠시보)에게도 그냥 +potency로 적중"하는 버그가 생김 — 저항 여부와는
    // 별개로, 애초에 무효화할 대상이 없는 경우이므로 저항(landed:false)과도 다르게 처리함.
    if (trait.requiresTargetFlag && !defender[trait.requiresTargetFlag]) {
      notes.push({ trait, landed: false, notApplicable: true, potency })
      continue // total에 아예 반영하지 않음 (견제 효과조차 없음 — 무효화할 대상 자체가 없으므로)
    }
    const forced = overrides[trait.type] // 'landed' | 'resisted' | undefined
    const isResisted = forced ? forced === 'resisted' : defender.resistances.includes(trait.type)
    if (isResisted) {
      // 완전 무효화(0점) 대신 potency의 일부는 "견제 효과"로 인정 — 저항이 있어도
      // 강력한 이능은 여전히 부담을 줘야 한다는 지적을 반영 (완전 면역이 아닌 이상 감쇄만 됨)
      total += Math.round(potency * RESIST_DAMPEN_RATIO)
      notes.push({ trait, landed: false, potency, forced: !!forced })
    } else {
      total += potency
      notes.push({ trait, landed: true, potency, forced: !!forced })
    }
  }
  return { total, notes }
}

export function simulate(A, B, opts = {}) {
  // opts.overridesOnB: { [traitType]: 'landed'|'resisted' } — A가 B에게 거는 hax 중 특정 태그의 결과를 강제
  // opts.overridesOnA: { [traitType]: 'landed'|'resisted' } — B가 A에게 거는 hax 중 특정 태그의 결과를 강제
  // (둘 다 반사실 시뮬레이션용 — 기본 호출 simulate(A, B)에서는 opts를 안 넘기므로 기존 동작과 100% 동일함)
  const { overridesOnB = {}, overridesOnA = {} } = opts
  const tierScoreA = TIER_SCORE[A.tier]
  const tierScoreB = TIER_SCORE[B.tier]
  const rawStatScoreA = statScore(A.stats)
  const rawStatScoreB = statScore(B.stats)
  const powerA = rawStatScoreA + tierScoreA
  const powerB = rawStatScoreB + tierScoreB

  const aOnB = oneSidedHax(A, B, overridesOnB) // A가 B에게 거는 헤스
  const bOnA = oneSidedHax(B, A, overridesOnA) // B가 A에게 거는 헤스
  let netModifier = aOnB.total - bOnA.total // A 기준 순보정치
  netModifier = Math.max(-MODIFIER_CAP, Math.min(MODIFIER_CAP, netModifier))

  const baseWinRateA = 1 / (1 + Math.pow(10, (powerB - powerA) / SCALE_FACTOR))
  let finalA = Math.round(baseWinRateA * 100 + netModifier)
  finalA = Math.max(5, Math.min(95, finalA))

  // v1.5: "산출 영수증" UI를 위해 파워 점수를 티어 성분/스탯 성분으로 분리해서 그대로 노출.
  // 프론트에서 별도로 근사치를 다시 계산하지 말고 이 breakdown 값을 그대로 표시해야
  // 리포트 텍스트-실제 계산 불일치 버그(과거 발생 이력 있음)가 재발하지 않음.
  const breakdown = {
    tierScoreA: Math.round(tierScoreA * 10) / 10,
    tierScoreB: Math.round(tierScoreB * 10) / 10,
    tierDiffA: Math.round((tierScoreA - tierScoreB) * 10) / 10, // A 기준(A-B)
    statScoreA: Math.round(rawStatScoreA * 10) / 10,
    statScoreB: Math.round(rawStatScoreB * 10) / 10,
    statDiffA: Math.round((rawStatScoreA - rawStatScoreB) * 10) / 10, // A 기준(A-B)
    haxNetA: netModifier, // A 기준(A-B), 이미 위에서 MODIFIER_CAP 적용됨
  }

  return {
    A: A.name,
    B: B.name,
    powerA: Math.round(powerA * 10) / 10,
    powerB: Math.round(powerB * 10) / 10,
    netModifier,
    winRateA: finalA,
    winRateB: 100 - finalA,
    aOnB,
    bOnA,
    breakdown,
  }
}

export function buildReport(A, B, result) {
  const winnerIsA = result.winRateA >= result.winRateB
  const winner = winnerIsA ? A : B
  const loser = winnerIsA ? B : A
  const powerDiff = Math.round(Math.abs(result.powerA - result.powerB) * 10) / 10
  // 순보정치는 항상 "승자 기준"으로 부호를 다시 맞춤 (버그 수정: 예전엔 승자의 원시 적중 합계를
  // 그대로 보여줘서, 양측 특성이 서로 상쇄된 경우에도 마치 헤스가 결정타인 것처럼 보이는 문제가 있었음)
  const winnerNet = winnerIsA ? result.netModifier : -result.netModifier

  const winnerHax = winnerIsA ? result.aOnB : result.bOnA // 승자가 패자에게 건 특성
  const loserHax = winnerIsA ? result.bOnA : result.aOnB // 패자가 승자에게 건 특성
  const winnerLanded = winnerHax.notes.filter((n) => n.landed)
  const loserLanded = loserHax.notes.filter((n) => n.landed)
  // notApplicable(애초에 적용 대상이 아님)은 "저항"과 의미가 다르므로 분리해서 집계함
  const loserResisted = loserHax.notes.filter((n) => !n.landed && !n.notApplicable)
  const winnerResisted = winnerHax.notes.filter((n) => !n.landed && !n.notApplicable)
  const loserNotApplicable = loserHax.notes.filter((n) => n.notApplicable)
  const winnerNotApplicable = winnerHax.notes.filter((n) => n.notApplicable)

  const lines = []
  lines.push(`${winner.name}(${winner.tier})가 ${loser.name}(${loser.tier})를 상대로 스탯/티어 기준 ${powerDiff}p 차이에서 출발.`)

  if (winnerLanded.length && loserLanded.length) {
    // 같은 태그로 묶인 특성끼리 부딪힌 경우, mechanism 필드가 있으면 실제 작동 방식 차이를 대조해서 설명
    // (단순히 "상쇄됨"이라고만 하면 왜 동급 취급되는지 설득력이 없다는 지적을 반영해 추가함)
    const sameTypeClashes = []
    for (const wNote of winnerLanded) {
      for (const lNote of loserLanded) {
        if (wNote.trait.type === lNote.trait.type && wNote.trait.mechanism && lNote.trait.mechanism) {
          sameTypeClashes.push({ type: wNote.trait.type, w: wNote.trait, l: lNote.trait })
        }
      }
    }
    if (sameTypeClashes.length) {
      for (const c of sameTypeClashes) {
        // 최종 순보정은 항상 실제 netModifier(winnerNet)를 사용 — 이 클래시 외 다른 특성까지
        // 모두 합산한 값이라 UI의 "hax 순보정" 칩과 정확히 일치함 (텍스트/계산 불일치 방지).
        const winnerNetStr = `${winnerNet >= 0 ? '+' : ''}${winnerNet}p`
        const clashBalance =
          c.w.potency === c.l.potency
            ? `두 능력의 위력(potency ${c.w.potency})이 동급이라 이 맞대결 자체는 서로 상쇄됨`
            : `두 능력의 위력 차이(potency ${c.w.potency} vs ${c.l.potency})가 있음`
        const potencyNote = `${clashBalance}. 양측 특성을 모두 합산한 최종 헤스 순보정은 ${winnerNetStr}로, 스탯/티어 격차(${powerDiff}p)와 함께 승부를 결정함.`
        lines.push(`${winner.name}의 [${c.w.label}]과 ${loser.name}의 [${c.l.label}]은 둘 다 [${c.type}] 계열로 묶여있지만 실제 작동 방식은 다름 — ${winner.name}: ${c.w.mechanism}. ${loser.name}: ${c.l.mechanism}. ${potencyNote}`)
      }
    } else {
      lines.push(`양측 특성([${winnerLanded.map((n) => n.trait.label).join(', ')}] vs [${loserLanded.map((n) => n.trait.label).join(', ')}])이 모두 적중함 — 위력(potency) 차이만큼 헤스 순보정 ${winnerNet >= 0 ? '+' : ''}${winnerNet}p가 반영되고, 나머지는 스탯/티어 격차(${powerDiff}p) 쪽이 결정함.`)
    }
  } else if (winnerLanded.length) {
    lines.push(`${winner.name}의 [${winnerLanded.map((n) => n.trait.label).join(', ')}] 특성이 무저항으로 적중 (헤스 순보정 ${winnerNet >= 0 ? '+' : ''}${winnerNet}p).`)
  }
  if (loserResisted.length) {
    const detail = loserResisted.map((n) => `${n.trait.label}(위력 ${n.potency} → 저항으로 ${Math.round(n.potency * RESIST_DAMPEN_RATIO)}만 인정)`).join(', ')
    lines.push(`${loser.name}의 [${detail}] 시도는 ${winner.name}의 저항(${winner.resistances.join(', ') || '없음'})에 부딪혀 위력 대부분이 깎였지만, 완전히 무효화되지는 않고 일부 견제 효과는 남음.`)
  }
  if (winnerResisted.length) {
    const detail = winnerResisted.map((n) => `${n.trait.label}(위력 ${n.potency} → 저항으로 ${Math.round(n.potency * RESIST_DAMPEN_RATIO)}만 인정)`).join(', ')
    lines.push(`${winner.name}의 [${detail}] 시도도 ${loser.name}의 저항에 부딪혀 위력 대부분이 깎였지만, 완전히 무효화되지는 않고 일부 견제 효과는 남음.`)
  }
  if (loserNotApplicable.length) {
    const detail = loserNotApplicable.map((n) => n.trait.label).join(', ')
    lines.push(`${loser.name}의 [${detail}] 시도는 ${winner.name}에게는 애초에 적용될 대상이 없어(전제조건 불충족) 발동 자체가 되지 않음 — 저항과 달리 견제 효과조차 없음.`)
  }
  if (winnerNotApplicable.length) {
    const detail = winnerNotApplicable.map((n) => n.trait.label).join(', ')
    lines.push(`${winner.name}의 [${detail}] 시도도 ${loser.name}에게는 애초에 적용될 대상이 없어(전제조건 불충족) 발동 자체가 되지 않음.`)
  }
  return lines.join(' ')
}

// v1.8: "판정 근거(Deciding Factors)" 화면용 데이터 빌더.
// 같은 형식(카드형 판정 근거 + 확인된 전제/남은 불확실성 + 조건별 분기 + 적용 원칙)을 우리 엔진이 실제로
// 계산한 값(characters.json의 mechanism/potency/resistances, breakdown, hax notes)만으로 채우기 위한 것 —
// 절대 새로운 서사/추정을 만들어내지 않고, 이미 계산된 값을 구조화해서 보여주기만 함.
const MODEL_UNCERTAINTIES = [
  '속도(speed)는 별도 변수로 분리하지 않고 5대 스탯 가중합에 포함해서 계산함 — 속도 격차가 압도적이어도 별도의 선제권 보정은 없음',
  '서로 다른 세계관 간 능력 체계(예: 저주력 vs 헤모글로빈 vs 하오슈쿠 하키)가 서로 완전히 호환된다고 가정하고 태그를 매칭함',
  '사전 정보/상대에 대한 준비 시간은 반영하지 않음 — 항상 서로를 처음 상대하는 조건으로 계산함',
  '발동 순서(선공/후공)는 계산하지 않고, 양측의 hax가 동시에 발동한다고 가정함',
]
const APPLIED_PRINCIPLE = '판정 순서: ① 전제조건(requiresTargetFlag) 충족 여부 → ② 저항 태그 매칭(저항 시 30%만 견제 효과로 인정) → ③ potency(위력) 비교 → ④ 티어/스탯 가중합. 전제조건을 충족하지 않는 hax는 저항 여부와 무관하게 적용되지 않고, 티어/스탯 격차가 클수록 헤스 보정(최대 ±30p)만으로는 뒤집기 어려움.'

export function buildDecidingFactors(A, B, result) {
  const winnerIsA = result.winRateA >= result.winRateB
  const winner = winnerIsA ? A : B
  const loser = winnerIsA ? B : A
  const bd = result.breakdown

  const factors = []
  const tierDiffForWinner = winnerIsA ? bd.tierDiffA : -bd.tierDiffA
  factors.push({
    title: '체급(티어) 격차',
    badge: tierDiffForWinner >= 0 ? '우세' : '열세',
    detail: `${winner.name}(${winner.tier}) vs ${loser.name}(${loser.tier}) — 티어 점수차 ${tierDiffForWinner >= 0 ? '+' : ''}${tierDiffForWinner}p`,
  })
  const statDiffForWinner = winnerIsA ? bd.statDiffA : -bd.statDiffA
  factors.push({
    title: '5대 스탯 가중합 격차',
    badge: statDiffForWinner >= 0 ? '우세' : '열세',
    detail: `스탯 가중합차 ${statDiffForWinner >= 0 ? '+' : ''}${statDiffForWinner}p (power·speed·durability·regeneration·battleIQ 가중합 기준)`,
  })

  const winnerHax = winnerIsA ? result.aOnB : result.bOnA // 승자가 패자에게 건 특성
  const loserHax = winnerIsA ? result.bOnA : result.aOnB // 패자가 승자에게 건 특성
  for (const note of winnerHax.notes) {
    if (note.notApplicable) {
      factors.push({ title: `${winner.name}의 [${note.trait.label}]`, badge: '무효(전제조건 불충족)', detail: note.trait.mechanism || '상대가 이 능력의 적용 대상 조건을 충족하지 않음' })
    } else if (note.landed) {
      factors.push({ title: `${winner.name}의 [${note.trait.label}] 적중`, badge: '우세', detail: `${note.trait.mechanism || ''} (potency ${note.potency})` })
    } else {
      factors.push({ title: `${winner.name}의 [${note.trait.label}] 저항당함`, badge: '제약', detail: `potency ${note.potency} → 저항으로 ${Math.round(note.potency * RESIST_DAMPEN_RATIO)}만 인정` })
    }
  }
  for (const note of loserHax.notes) {
    if (note.notApplicable) {
      factors.push({ title: `${loser.name}의 [${note.trait.label}]`, badge: '무효(전제조건 불충족)', detail: note.trait.mechanism || '상대가 이 능력의 적용 대상 조건을 충족하지 않음' })
    } else if (note.landed) {
      factors.push({ title: `${loser.name}의 [${note.trait.label}] 적중`, badge: '패자 쪽 적중(견제 요인)', detail: `${note.trait.mechanism || ''} (potency ${note.potency})` })
    } else {
      factors.push({ title: `${loser.name}의 [${note.trait.label}] 저항당함`, badge: '승자 방어 성공', detail: `potency ${note.potency} → 저항으로 ${Math.round(note.potency * RESIST_DAMPEN_RATIO)}만 인정` })
    }
  }

  const confirmedPremises = [
    ...A.haxTraits.map((t) => `${A.name}: [${t.label}] — ${t.mechanism || '(mechanism 미기재)'} (potency ${t.potency || DEFAULT_POTENCY})`),
    ...B.haxTraits.map((t) => `${B.name}: [${t.label}] — ${t.mechanism || '(mechanism 미기재)'} (potency ${t.potency || DEFAULT_POTENCY})`),
    `${A.name} 저항 목록: ${A.resistances.length ? A.resistances.join(', ') : '없음'}`,
    `${B.name} 저항 목록: ${B.resistances.length ? B.resistances.join(', ') : '없음'}`,
  ]

  return {
    factors,
    confirmedPremises,
    remainingUncertainties: MODEL_UNCERTAINTIES,
    appliedPrinciple: APPLIED_PRINCIPLE,
  }
}

// v1.8: "조건별 판정 분기" — 서사를 지어내는 대신, 실제로 landed/resisted였던 hax를 반대로 뒤집어서
// simulate()를 다시 돌린 진짜 반사실(counterfactual) 결과를 보여줌. notApplicable은 사실(전제조건 불충족)이라
// 뒤집을 대상이 아니므로 분기에서 제외함.
export function buildCounterfactuals(A, B) {
  const base = simulate(A, B)
  const branches = []

  for (const note of base.aOnB.notes) {
    if (note.notApplicable) continue
    const flip = note.landed ? 'resisted' : 'landed'
    const cf = simulate(A, B, { overridesOnB: { [note.trait.type]: flip } })
    branches.push({
      side: 'A',
      character: A.name,
      traitLabel: note.trait.label,
      from: note.landed ? '적중' : '저항',
      to: flip === 'landed' ? '적중' : '저항',
      label: `만약 ${A.name}의 [${note.trait.label}]이 ${flip === 'landed' ? '무저항으로 적중했다면' : '완전히 저항당했다면'}`,
      winRateA: cf.winRateA,
      winRateB: cf.winRateB,
      deltaA: cf.winRateA - base.winRateA,
    })
  }
  for (const note of base.bOnA.notes) {
    if (note.notApplicable) continue
    const flip = note.landed ? 'resisted' : 'landed'
    const cf = simulate(A, B, { overridesOnA: { [note.trait.type]: flip } })
    branches.push({
      side: 'B',
      character: B.name,
      traitLabel: note.trait.label,
      from: note.landed ? '적중' : '저항',
      to: flip === 'landed' ? '적중' : '저항',
      label: `만약 ${B.name}의 [${note.trait.label}]이 ${flip === 'landed' ? '무저항으로 적중했다면' : '완전히 저항당했다면'}`,
      winRateA: cf.winRateA,
      winRateB: cf.winRateB,
      deltaA: cf.winRateA - base.winRateA,
    })
  }

  return { base, branches }
}

// 필요 시 다른 모듈에서 재사용 (팀전 등)
export { oneSidedHax, statScore, powerScore, TIER_SCORE, STAT_WEIGHTS }
