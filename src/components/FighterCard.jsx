import Avatar from './Avatar'
import HaxBadge from './HaxBadge'
import {
  TIER_LABEL,
  TIER_COLOR,
  COLOR_GOLD,
  universeColor,
  universeShort,
  assetUrl,
} from '../lib/constants'

/**
 * 격투게임 캐릭터 셀렉트 풍 카드.
 * - 배경/테두리 레이어에만 skew 를 걸고, 텍스트/포트레이트 콘텐츠 레이어는 straight 로 유지(가독성).
 * - 배경엔 아바타를 확대·blur·darken 한 실루엣.
 * - state: idle | winner | loser (loser 는 그레이스케일, winner 는 골드 글로우 + WINNER 뱃지 + scale-up).
 * - winRate: 결과 공개 후에만 큰 숫자로 표시.
 * - haxNotes: [{trait, landed}] — 있으면 landed=false 를 빨간 무효화 뱃지로. 없으면 캐릭터 haxTraits 를 그대로.
 */
export default function FighterCard({ character, side = 'A', state = 'idle', winRate = null, haxNotes = null }) {
  if (!character) {
    return (
      <div className="flex min-h-[360px] flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 text-sm text-slate-500">
        {side === 'A' ? '왼쪽 파이터를 선택하세요' : '오른쪽 파이터를 선택하세요'}
      </div>
    )
  }

  const accent = universeColor(character.universe)
  const tierColor = TIER_COLOR[character.tier] ?? '#64748b'
  const isWinner = state === 'winner'
  const isLoser = state === 'loser'
  const skew = side === 'A' ? '-5deg' : '5deg'

  const traits = haxNotes
    ? haxNotes
    : character.haxTraits.map((trait) => ({ trait, landed: true }))

  return (
    <div
      className="relative min-h-[360px] flex-1 transition-transform duration-300"
      style={{
        transform: isWinner ? 'scale(1.03)' : undefined,
        filter: isLoser ? 'grayscale(1) brightness(0.72)' : undefined,
      }}
    >
      {/* 스큐된 배경/테두리 레이어 */}
      <div
        className="absolute inset-0 overflow-hidden rounded-2xl border-2"
        style={{
          transform: `skewX(${skew})`,
          borderColor: isWinner ? COLOR_GOLD : accent,
          background: `linear-gradient(160deg, ${accent}26, #0b1220 55%, #05070f)`,
          boxShadow: isWinner
            ? `0 0 34px ${COLOR_GOLD}66, 0 0 0 2px ${COLOR_GOLD}`
            : `0 0 18px ${accent}33`,
        }}
      >
        {character.avatar && (
          <img
            src={assetUrl(character.avatar)}
            alt=""
            aria-hidden
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
            className="absolute left-1/2 top-1/2 h-[160%] w-[160%] -translate-x-1/2 -translate-y-1/2 object-cover"
            style={{ filter: 'blur(7px) brightness(0.45)', opacity: 0.32 }}
            draggable={false}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(2,6,23,0.35), rgba(2,6,23,0.88))',
          }}
        />
      </div>

      {/* 콘텐츠 레이어 (skew 없음) */}
      <div className="absolute inset-0 flex flex-col items-center px-5 py-5 text-center">
        {isWinner && (
          <div
            className="vn-winner absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-black uppercase tracking-widest text-slate-900 shadow-lg"
            style={{ letterSpacing: '0.15em' }}
          >
            ★ WINNER
          </div>
        )}

        {/* 포트레이트 */}
        <div
          className="mt-3 rounded-full"
          style={{
            boxShadow: `0 0 0 3px ${isWinner ? COLOR_GOLD : accent}, 0 0 20px ${accent}55`,
          }}
        >
          <Avatar
            character={character}
            size={112}
            rounded="rounded-full"
            initialClassName="text-4xl"
          />
        </div>

        {/* 이름 */}
        <div className="mt-3 line-clamp-2 text-xl font-black leading-tight text-slate-50">
          {character.name}
        </div>

        {/* 작품 + 티어 뱃지 */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          <span
            className="rounded border px-1.5 py-0.5 text-[10px] font-bold"
            style={{ color: accent, borderColor: `${accent}88`, backgroundColor: `${accent}1f` }}
          >
            {universeShort(character.universe)}
          </span>
          <span
            className="rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase"
            style={{ color: tierColor, borderColor: `${tierColor}88`, backgroundColor: `${tierColor}1f` }}
          >
            {TIER_LABEL[character.tier] ?? character.tier}
          </span>
        </div>

        {/* hax 뱃지 */}
        {traits.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            {traits.map((t, i) => (
              <HaxBadge key={i} label={t.trait.label} nullified={!t.landed} />
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* 승률 (공개 후) */}
        {winRate != null && (
          <div
            className="font-display leading-none"
            style={{ color: isWinner ? COLOR_GOLD : accent }}
          >
            <span className="text-6xl font-black tabular-nums">{winRate}</span>
            <span className="align-top text-2xl font-bold">%</span>
          </div>
        )}
      </div>
    </div>
  )
}
