import React, { useMemo, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';

export type DockNavItemConfig = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  special?: boolean;
};

type SpringConfig = {
  stiffness: number;
  damping: number;
  mass: number;
};

export type DockNavRenderCtx = {
  item: DockNavItemConfig;
  isActive: boolean;
  scale: MotionValue<number>;
  y: MotionValue<number>;
};

export type DockNavProps = {
  items: DockNavItemConfig[];
  activeId: string;
  onItemClick: (item: DockNavItemConfig, e: React.MouseEvent | React.PointerEvent) => void;
  className?: string;
  itemClassName?: string;
  wrapScale?: boolean; // if false, consumer controls where scale/y are applied
  baseItemWidth?: number; // px
  widthBoost?: number; // px
  influenceRadius?: number; // px
  maxScale?: number;
  lift?: number; // px
  spring?: Partial<SpringConfig>;
  renderItem: (ctx: DockNavRenderCtx) => React.ReactNode;
};

const DEFAULT_SPRING: SpringConfig = { stiffness: 520, damping: 32, mass: 0.6 };

function gaussianFalloff(distance: number, sigma: number) {
  // exp(-d^2 / 2σ^2)
  return Math.exp(-(distance * distance) / (2 * sigma * sigma));
}

const DockNavItem: React.FC<{
  item: DockNavItemConfig;
  isActive: boolean;
  mouseX: MotionValue<number>;
  baseItemWidth: number;
  widthBoost: number;
  influenceRadius: number;
  maxScale: number;
  lift: number;
  wrapScale: boolean;
  spring: SpringConfig;
  itemClassName?: string;
  onItemClick: (item: DockNavItemConfig, e: React.MouseEvent | React.PointerEvent) => void;
  renderItem: (ctx: DockNavRenderCtx) => React.ReactNode;
}> = ({
  item,
  isActive,
  mouseX,
  baseItemWidth,
  widthBoost,
  influenceRadius,
  maxScale,
  lift,
  wrapScale,
  spring,
  itemClassName,
  onItemClick,
  renderItem,
}) => {
  const ref = useRef<HTMLButtonElement | null>(null);

  const scaleTarget = useMotionValue(1);
  const widthTarget = useMotionValue(baseItemWidth);

  const scale = useSpring(scaleTarget, spring);
  const width = useSpring(widthTarget, spring);

  const y = useTransform(scale, [1, maxScale], [0, -Math.max(0, lift)]);

  useMotionValueEvent(mouseX, 'change', (x) => {
    const el = ref.current;
    if (!el || !Number.isFinite(x)) {
      scaleTarget.set(1);
      widthTarget.set(baseItemWidth);
      return;
    }

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const d = Math.abs(x - centerX);

    const sigma = Math.max(1, influenceRadius / 2);
    const g = gaussianFalloff(d, sigma);

    // Clamp very far pointers to avoid tiny micro-changes.
    const normalized = d > influenceRadius * 2 ? 0 : g;

    const targetScale = 1 + (maxScale - 1) * normalized;
    const targetWidth = baseItemWidth + widthBoost * normalized;

    scaleTarget.set(targetScale);
    widthTarget.set(targetWidth);
  });

  return (
    <motion.button
      ref={ref}
      type="button"
      style={{
        width: item.special ? baseItemWidth + widthBoost * 0.25 : width,
        touchAction: 'none',
      }}
      onClick={(e) => onItemClick(item, e)}
      className={itemClassName}
    >
      {wrapScale ? (
        <motion.div style={{ scale, y }} className="w-full h-full flex items-center justify-center">
          {renderItem({ item, isActive, scale, y })}
        </motion.div>
      ) : (
        renderItem({ item, isActive, scale, y })
      )}
    </motion.button>
  );
};

export const DockNav: React.FC<DockNavProps> = ({
  items,
  activeId,
  onItemClick,
  className,
  itemClassName,
  wrapScale = true,
  baseItemWidth = 64,
  widthBoost = 36,
  influenceRadius = 140,
  maxScale = 1.55,
  lift = 12,
  spring,
  renderItem,
}) => {
  const mouseX = useMotionValue<number>(Number.POSITIVE_INFINITY);
  const springCfg = useMemo(() => ({ ...DEFAULT_SPRING, ...(spring ?? {}) }), [spring]);

  return (
    <div
      className={className}
      onPointerMove={(e) => mouseX.set(e.clientX)}
      onPointerEnter={(e) => mouseX.set(e.clientX)}
      onPointerLeave={() => mouseX.set(Number.POSITIVE_INFINITY)}
    >
      {items.map((item) => (
        <DockNavItem
          key={item.id}
          item={item}
          isActive={activeId === item.id}
          mouseX={mouseX}
          baseItemWidth={baseItemWidth}
          widthBoost={widthBoost}
          influenceRadius={influenceRadius}
          maxScale={item.special ? Math.min(maxScale, 1.25) : maxScale}
          lift={lift}
          wrapScale={wrapScale}
          spring={springCfg}
          itemClassName={itemClassName}
          onItemClick={onItemClick}
          renderItem={renderItem}
        />
      ))}
    </div>
  );
};


