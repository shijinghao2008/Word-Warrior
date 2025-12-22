import React, { useMemo, useState } from 'react';
import { type DockNavItemConfig } from './DockNav';

type GameBottomNavItem = DockNavItemConfig & {
  disabled?: boolean;
  sprites: {
    normal: string;
    active: string;
    pressed?: string; // only used by arena/battle
  };
};

export type GameBottomNavProps = {
  activeId: string;
  onSelect: (id: string) => void;
};

function TextStroke({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-white font-black tracking-wide select-none"
      style={{
        textShadow:
          '0 2px 0 rgba(0,0,0,0.85), 2px 0 0 rgba(0,0,0,0.85), -2px 0 0 rgba(0,0,0,0.85), 0 -2px 0 rgba(0,0,0,0.85)',
      }}
    >
      {children}
    </span>
  );
}

function SpriteIcon({
  src,
  alt,
  size = 72,
}: {
  src: string;
  alt: string;
  size?: number;
}) {
  return (
    <img
      draggable={false}
      src={src}
      alt={alt}
      style={{
        imageRendering: 'pixelated',
        filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.65))',
      }}
      className="select-none pointer-events-none"
      width={size}
      height={size}
    />
  );
}

export const GameBottomNav: React.FC<GameBottomNavProps> = ({ activeId, onSelect }) => {
  const [pressedId, setPressedId] = useState<string | null>(null);

  const items: GameBottomNavItem[] = useMemo(
    () => [
      {
        id: 'vocab',
        label: '背单词',
        sprites: { normal: '/assets/nav/vocab.png', active: '/assets/nav/vocab_active.png' },
      },
      {
        id: 'scholar',
        label: '学习之路',
        sprites: { normal: '/assets/nav/scholar.png', active: '/assets/nav/scholar_active.png' },
      },
      {
        id: 'arena',
        label: '对战',
        sprites: {
          normal: '/assets/nav/arena.png',
          active: '/assets/nav/arena_active.png',
          pressed: '/assets/nav/arena_pressed.png',
        },
      },
      {
        id: 'leaderboard',
        label: '排行榜',
        sprites: { normal: '/assets/nav/leaderboard.png', active: '/assets/nav/leaderboard_active.png' },
      },
      {
        id: 'profile',
        label: '档案',
        sprites: { normal: '/assets/nav/profile.png', active: '/assets/nav/profile_active.png' },
      },
    ],
    []
  );

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[200] px-3 pt-2 pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
    >
      <div className="max-w-lg mx-auto pointer-events-auto">
        {/* game-like solid background (non-transparent) */}
        <div
          className="relative w-full rounded-[16px] px-2.5 pt-2"
          style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 6px)',
            // lighter “game panel” palette
            background: 'linear-gradient(180deg, #6e78a0 0%, #4c5474 100%)',
            border: '2px solid rgba(255,255,255,0.18)',
            boxShadow:
              '0 6px 0 rgba(0,0,0,0.28), 0 10px 18px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.22)',
          }}
        >
          {/* icons only: no fisheye, no squeeze, no lift, no spring */}
          <div className="w-full flex items-end justify-between gap-1">
            {items.map((item) => {
              const isActive = item.id === activeId;
              const isPressed = pressedId === item.id;
              const spriteSrc =
                item.id === 'arena' && isPressed && item.sprites.pressed
                  ? item.sprites.pressed
                  : isActive
                    ? item.sprites.active
                    : item.sprites.normal;

              // Make these three slightly bigger as requested
              const bigIcon = item.id === 'scholar' || item.id === 'leaderboard' || item.id === 'profile';
              const iconSize = bigIcon ? 78 : 72;

              return (
                <button
                  key={item.id}
                  type="button"
                  className="relative flex-1 flex flex-col items-center justify-center outline-none"
                  style={{ minWidth: 0 }}
                  onClick={() => {
                    if (item.disabled) return;
                    onSelect(item.id);
                  }}
                  onPointerDown={() => item.id === 'arena' && setPressedId('arena')}
                  onPointerUp={() => item.id === 'arena' && setPressedId(null)}
                  onPointerCancel={() => item.id === 'arena' && setPressedId(null)}
                  onPointerLeave={() => item.id === 'arena' && setPressedId(null)}
                >
                  <div className="relative w-[82px] h-[78px] flex items-center justify-center">
                    {spriteSrc && (
                      <div
                        className="relative"
                        style={{
                          filter: isActive ? 'drop-shadow(0 0 16px rgba(64, 160, 255, 0.55))' : undefined,
                        }}
                      >
                        <SpriteIcon src={spriteSrc} alt={item.label} size={iconSize} />
                      </div>
                    )}
                  </div>

                  <div className="mt-0 leading-none">
                    <span
                      className={`${isActive ? 'opacity-100' : 'opacity-80'} text-[10px]`}
                      style={{ display: 'inline-block' }}
                    >
                      <TextStroke>{item.label}</TextStroke>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};


