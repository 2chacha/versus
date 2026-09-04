import { useEffect, useRef, useState } from 'react'

/**
 * 결과 공개용 카운트업 진행도 0→1 (easeOutCubic).
 * - active 가 true 가 되면 애니메이션 시작, trigger 가 바뀔 때마다 다시 재생.
 * - rAF 는 백그라운드 탭에서 멈추므로 setTimeout 폴백으로 최종값(1) 보장.
 * (VsArena 의 승률 카운트업과 동일한 연출을 팀전에서도 재사용하기 위한 훅)
 */
export function useReveal(active, trigger, dur = 520) {
  const [reveal, setReveal] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    if (!active) {
      setReveal(0)
      return
    }
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur)
      setReveal(1 - Math.pow(1 - t, 3))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    const settle = setTimeout(() => setReveal(1), dur + 80)
    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(settle)
    }
  }, [active, trigger, dur])

  return reveal
}
