import React, { useMemo, useState } from 'react';
import { motion, type MotionValue } from 'framer-motion';
import { DockNav, type DockNavItemConfig } from './DockNav';

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
      className="text-white font-black tracking-wider select-none"
      style={{
        textShadow:
          '0 2px 0 rgba(0,0,0,0.85), 2px 0 0 rgba(0,0,0,0.85), -2px 0 0 rgba(0,0,0,0.85), 0 -2px 0 rgba(0,0,0,0.85)',
      }}
    >
      {children}
    </span>
  );
}

function TrianglePointer({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2"
      style={{
        width: 0,
        height: 0,
        borderTop: '10px solid transparent',
        borderBottom: '10px solid transparent',
        ...(side === 'left'
          ? { left: -10, borderRight: '14px solid #FCCB59' }
          : { right: -10, borderLeft: '14px solid #FCCB59' }),
        filter: 'drop-shadow(0 2px 0 rgba(0,0,0,0.7))',
      }}
    />
  );
}

function SpriteIcon({
  src,
  alt,
  scale,
  y,
}: {
  src: string;
  alt: string;
  scale: MotionValue<number>;
  y: MotionValue<number>;
}) {
  return (
    <motion.img
      draggable={false}
      src={src}
      alt={alt}
      style={{
        scale,
        y,
        imageRendering: 'pixelated',
        filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.65))',
      }}
      className="w-[56px] h-[56px] select-none pointer-events-none"
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
    <div className="fixed bottom-0 left-0 right-0 z-[200] px-3 pb-5 pt-2 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto">
        {/* No bar/frame: icons-only dock */}
        <DockNav
          items={items}
          activeId={activeId}
          onItemClick={(item) => {
            const found = items.find((x) => x.id === item.id);
            if (found?.disabled) return;
            onSelect(item.id);
          }}
          wrapScale={false}
          baseItemWidth={72}
          widthBoost={26}
          influenceRadius={150}
          maxScale={1.34}
          lift={8}
          spring={{ stiffness: 560, damping: 34, mass: 0.7 }}
          className="w-full flex items-end justify-center gap-2 overflow-visible"
          itemClassName="relative shrink-0 bg-transparent p-0 outline-none"
          renderItem={({ item, isActive, scale, y }) => {
            const cfg = items.find((x) => x.id === item.id);
            const isPressed = pressedId === item.id;
            const spriteSrc =
              item.id === 'arena' && isPressed && cfg?.sprites.pressed
                ? cfg.sprites.pressed
                : isActive
                  ? cfg?.sprites.active
                  : cfg?.sprites.normal;

            return (
              <div className="relative flex flex-col items-center justify-center">
                <div
                  className="relative w-[72px] h-[72px] flex items-center justify-center"
                  onPointerDown={() => item.id === 'arena' && setPressedId('arena')}
                  onPointerUp={() => item.id === 'arena' && setPressedId(null)}
                  onPointerCancel={() => item.id === 'arena' && setPressedId(null)}
                  onPointerLeave={() => item.id === 'arena' && setPressedId(null)}
                >
                  {/* Side pointers for active (kept, but without any surrounding frame) */}
                  {isActive && (
                    <>
                      <TrianglePointer side="left" />
                      <TrianglePointer side="right" />
                    </>
                  )}

                  {spriteSrc && (
                    <div
                      className="relative"
                      style={{
                        filter: isActive ? 'drop-shadow(0 0 14px rgba(64, 160, 255, 0.55))' : undefined,
                      }}
                    >
                      <SpriteIcon src={spriteSrc} alt={item.label} scale={scale} y={y} />
                    </div>
                  )}
                </div>

                {/* Only show label for active */}
                {isActive && (
                  <div className="mt-2">
                    <TextStroke>{item.label}</TextStroke>
                  </div>
                )}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
};


