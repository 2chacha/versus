import { simulate, buildReport } from './battleEngine'

// 피로도 설계값
export const FATIGUE_PER_MATCH_MAX = 0.2 // 접전(승률 50%)일 때 이번 매치 피로도 상한
export const FATIGUE_CAP = 0.35 // 누적 피로도 총합 상한

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

// 이번 매치의 피로도: 승자 승률이 50%에 가까울수록(접전) 크고, 95%에 가까울수록(압승) 0에 수렴.
export function fatigueFromWinnerRate(winnerRate) {
  return FATIGUE_PER_MATCH_MAX * ((95 - clamp(winnerRate, 50, 95)) / 45)
}

// 피로도를 반영한 캐릭터: stats 만 얕은 복사해 (1 - fatigue) 배. tier / haxTraits(potency)는 그대로.
export function withFatigue(char, fatigue) {
  if (!fatigue) return char
  const stats = { ...char.stats }
  for (const k of Object.keys(stats)) stats[k] = stats[k] * (1 - fatigue)
  return { ...char, stats }
}

/**
 * 팀전(서바이벌/격파전) 전체 브래킷을 미리 계산.
 * - 승자 잔류(king-of-the-hill): 각 팀 선두끼리 simulate, 패자 탈락, 승자는 상대 팀 다음 주자와 계속.
 * - 한쪽 팀 전원 탈락까지 반복. 팀 인원수는 배열 길이로 가변(2v2·3v3 동일 로직).
 * - 새 계산 로직 없음: 기존 simulate / buildReport 만 반복 호출.
 * teamA, teamB: 전투 순서대로 정렬된 캐릭터 객체 배열.
 */
export function runTeamBattle(teamA, teamB) {
  let aIdx = 0
  let bIdx = 0
  const fatigue = {} // charId -> 누적 피로도
  const matches = []
  let scoreA = 0
  let scoreB = 0

  while (aIdx < teamA.length && bIdx < teamB.length) {
    const rawA = teamA[aIdx]
    const rawB = teamB[bIdx]
    const fatA = fatigue[rawA.id] || 0
    const fatB = fatigue[rawB.id] || 0
    const fighterA = withFatigue(rawA, fatA)
    const fighterB = withFatigue(rawB, fatB)

    const result = simulate(fighterA, fighterB)
    const report = buildReport(fighterA, fighterB, result)
    const aWins = result.winRateA >= result.winRateB
    const winnerRate = aWins ? result.winRateA : result.winRateB
    const fatigueThisMatch = fatigueFromWinnerRate(winnerRate)

    matches.push({
      index: matches.length,
      rawA,
      rawB,
      fighterA, // 피로도 반영된(실제 simulate 에 넘긴) 캐릭터
      fighterB,
      fatA, // 이 매치에 실제로 적용된 피로도(진입 시점 누적치)
      fatB,
      result,
      report,
      aWins,
      winnerRate,
      fatigueThisMatch,
      winnerId: aWins ? rawA.id : rawB.id,
      loserId: aWins ? rawB.id : rawA.id,
    })

    if (aWins) {
      scoreA += 1
      fatigue[rawA.id] = Math.min(FATIGUE_CAP, fatA + fatigueThisMatch)
      bIdx += 1
    } else {
      scoreB += 1
      fatigue[rawB.id] = Math.min(FATIGUE_CAP, fatB + fatigueThisMatch)
      aIdx += 1
    }
  }

  const winner = aIdx < teamA.length ? 'A' : 'B'
  return { matches, winner, scoreA, scoreB }
}

// 매치 0..resolvedCount-1 까지 반영된 각 캐릭터의 누적 피로도(슬롯 배지용).
export function accumulatedFatigue(matches, resolvedCount) {
  const acc = {}
  for (let i = 0; i < resolvedCount && i < matches.length; i++) {
    const m = matches[i]
    acc[m.winnerId] = Math.min(FATIGUE_CAP, (acc[m.winnerId] || 0) + m.fatigueThisMatch)
  }
  return acc
}
