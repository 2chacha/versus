// Versus Nexus — 확정 계산 엔진
// battle-engine-reference.js 에서 "로직 변경 없이" 포팅한 것.
// 원본과의 차이는 딱 세 가지뿐:
//   1) Node의 fs/path 로 characters.json 을 읽던 부분 제거 (프론트에서 import 로 주입)
//   2) 전체 매치업을 돌려 results.md 를 쓰던 실행 스크립트 부분 제거
//   3) simulate / buildReport 를 ES module 로 export
// 파워 스코어 / hax 순보정 / 로지스틱 승률 계산식은 원본과 100% 동일.

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
function oneSidedHax(attacker, defender) {
  let total = 0
  const notes = []
  for (const trait of attacker.haxTraits) {
    const potency = trait.potency || DEFAULT_POTENCY
    if (defender.resistances.includes(trait.type)) {
      // 완전 무효화(0점) 대신 potency의 일부는 "견제 효과"로 인정 — 저항이 있어도
      // 강력한 이능은 여전히 부담을 줘야 한다는 지적을 반영 (완전 면역이 아닌 이상 감쇄만 됨)
      total += Math.round(potency * RESIST_DAMPEN_RATIO)
      notes.push({ trait, landed: false, potency })
    } else {
      total += potency
      notes.push({ trait, landed: true, potency })
    }
  }
  return { total, notes }
}

export function simulate(A, B) {
  const tierScoreA = TIER_SCORE[A.tier]
  const tierScoreB = TIER_SCORE[B.tier]
  const rawStatScoreA = statScore(A.stats)
  const rawStatScoreB = statScore(B.stats)
  const powerA = rawStatScoreA + tierScoreA
  const powerB = rawStatScoreB + tierScoreB

  const aOnB = oneSidedHax(A, B) // A가 B에게 거는 헤스
  const bOnA = oneSidedHax(B, A) // B가 A에게 거는 헤스
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
    haxNetA: netModifier, // A 기준(A-B), 이미 MODIFIER_CAP 적용됨
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
  const loserResisted = loserHax.notes.filter((n) => !n.landed)
  const winnerResisted = winnerHax.notes.filter((n) => !n.landed)

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
        const winnerNetStr = `${winnerNet >= 0 ? '+' : ''}${winnerNet}p`
        const clashBalance =
          c.w.potency === c.l.potency
            ? `두 능력의 위력(potency ${c.w.potency})이 동급이라 이 맞대결 자체는 서로 상쇄됨`
            : `두 능력의 위력 차이(potency ${c.w.potency} vs ${c.l.potency})가 있음`
        // 최종 순보정은 항상 실제 netModifier(winnerNet)를 사용 — 이 클래시 외 다른 특성까지
        // 모두 합산한 값이라 UI의 "HAX 순보정" 칩과 정확히 일치함 (텍스트/계산 불일치 방지).
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
  return lines.join(' ')
}
