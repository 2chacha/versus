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
      <div className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-700 p-4 text-center sm:min-h-[360px]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-slate-600 text-3xl text-slate-500">
          ?
        </div>
        <div className="text-sm font-semibold text-slate-400">
          {side === 'A' ? '왼쪽 파이터 선택' : '오른쪽 파이터 선택'}
        </div>
        <div className="text-xs text-slate-600">아래에서 캐릭터를 골라주세요</div>
      </div>
    )
  }

  const accent = universeColor(character.universe)
  const tierColor = TIER_COLOR[character.tier] ?? '#64748b'
  const isWinner = state === 'winner'
  const isLoser = state === 'loser'
  // 모바일(<sm)에서는 skew 를 없애 트래피조이드가 화면 폭을 넘지 않게, sm 이상에서만 기울임.
  const skewClass = side === 'A' ? 'skew-x-0 sm:-skew-x-[5deg]' : 'skew-x-0 sm:skew-x-[5deg]'

  const traits = haxNotes
    ? haxNotes
    : character.haxTraits.map((trait) => ({ trait, landed: true }))

  return (
    <div
      className="relative min-h-[300px] w-full transition-transform duration-300 sm:min-h-[360px]"
      style={{
        transform: isWinner ? 'scale(1.03)' : undefined,
        filter: isLoser ? 'grayscale(1) brightness(0.72)' : undefined,
      }}
    >
      {/* 스큐된 배경/테두리 레이어 (skew 는 sm 이상에서만) */}
      <div
        className={`absolute inset-0 overflow-hidden rounded-2xl border-2 ${skewClass}`}
        style={{
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
      <div className="absolute inset-0 flex flex-col items-center px-4 py-5 text-center sm:px-5">
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

        {/* 이름 — 모바일에서 폰트가 좁은 카드에 맞게 clamp 로 줄어들고 2줄까지 줄바꿈 */}
        <div
          className="mt-3 line-clamp-2 break-words font-black leading-tight text-slate-50"
          style={{ fontSize: 'clamp(0.95rem, 3.8vw, 1.25rem)' }}
        >
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
              <HaxBadge key={i} label={t.trait.label} nullified={!t.landed} potency={t.trait.potency} />
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
            <span
              className="font-black tabular-nums"
              style={{ fontSize: 'clamp(2.75rem, 12vw, 3.75rem)' }}
            >
              {winRate}
            </span>
            <span
              className="align-top font-bold"
              style={{ fontSize: 'clamp(1.1rem, 5vw, 1.5rem)' }}
            >
              %
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
