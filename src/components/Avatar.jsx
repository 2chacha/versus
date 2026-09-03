import { useState } from 'react'
import { TIER_COLOR, avatarFocus, assetUrl } from '../lib/constants'

function initial(name) {
  if (!name) return '?'
  const first = name.trim()[0]
  return first ? first.toUpperCase() : '?'
}

/**
 * 캐릭터 아바타.
 * - avatar 파일이 있으면 이미지, 없거나 로드 실패하면 이름 이니셜 + 티어 컬러 원형 플레이스홀더.
 * - fill: 부모(relative)를 꽉 채움. 아니면 size(px) 정사각형.
 * - grayscale: 패배 카드 등에서 흑백 처리.
 */
export default function Avatar({
  character,
  size = 48,
  fill = false,
  rounded = 'rounded-full',
  grayscale = false,
  className = '',
  initialClassName = '',
}) {
  const [errored, setErrored] = useState(false)
  const hasImg = !!character?.avatar && !errored
  const tierColor = TIER_COLOR[character?.tier] ?? '#64748b'
  const filter = grayscale ? 'grayscale(1) brightness(0.7)' : undefined

  const wrapperStyle = fill ? undefined : { width: size, height: size }

  return (
    <div
      className={`relative overflow-hidden ${rounded} ${fill ? 'h-full w-full' : ''} ${className}`}
      style={wrapperStyle}
    >
      {hasImg ? (
        <img
          src={assetUrl(character.avatar)}
          alt={character.name}
          onError={() => setErrored(true)}
          className="h-full w-full object-cover"
          style={{ filter, objectPosition: avatarFocus(character.id) }}
          draggable={false}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center font-black text-white/90 ${initialClassName}`}
          style={{
            background: `radial-gradient(circle at 50% 32%, ${tierColor}, ${tierColor}66 60%, #0b1220)`,
            filter,
            fontSize: fill ? undefined : Math.round(size * 0.42),
          }}
        >
          {initial(character?.name)}
        </div>
      )}
    </div>
  )
}
