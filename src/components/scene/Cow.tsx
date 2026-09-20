'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { COW_EAT, COW_H, COW_STAND, COW_W, COW_WALK, type CowFrame } from '@/lib/cow';
import { MOO_MS, moo } from '@/lib/moo';
import { toRuns } from '@/lib/pixel';

/** Frame list, flattened so the animation loop can index straight into it. */
const FRAMES: CowFrame[] = [COW_STAND, ...COW_WALK, ...COW_EAT];
const STAND_INDEX = 0;
const WALK_START = 1;
const EAT_START = 1 + COW_WALK.length;

const PALETTE: Record<string, string> = {
  w: 'var(--cow-hide)',
  b: 'var(--cow-patch)',
  k: 'var(--cow-outline)',
  p: 'var(--cow-pink)',
  n: 'var(--cow-nostril)',
  e: 'var(--cow-eye)',
};

/** Milliseconds per frame. */
const WALK_FRAME_MS = 170;
const CHEW_FRAME_MS = 420;
/** Percent of the field crossed per second. */
const WALK_SPEED = 2.4;

const WALK_MS = [5000, 11000] as const;
const GRAZE_MS = [6000, 14000] as const;
/** Keeps the cow clear of the very edges of the field. */
const EDGE_MARGIN = 4;

type Phase = 'walking' | 'grazing';

const rand = ([min, max]: readonly [number, number]) => min + Math.random() * (max - min);

export function Cow() {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const speakTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onMoo = useCallback(() => {
    if (moo()) {
      setSpeaking(true);
      clearTimeout(speakTimer.current);
      speakTimer.current = setTimeout(() => setSpeaking(false), MOO_MS);
    }
  }, []);

  useEffect(() => () => clearTimeout(speakTimer.current), []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const showFrame = (index: number) => {
      frameRefs.current.forEach((el, i) => {
        if (el) el.style.display = i === index ? 'block' : 'none';
      });
    };

    // translateX with a percentage resolves against the element's OWN width,
    // so the walk is driven in pixels off a measured field width instead.
    let fieldWidth = root.parentElement?.clientWidth ?? window.innerWidth;
    // The right-hand limit has to allow for the cow's own width, or she walks
    // half off the edge of a narrow screen.
    let minX = EDGE_MARGIN;
    let maxX = 100 - EDGE_MARGIN;
    const measure = () => {
      fieldWidth = root.parentElement?.clientWidth ?? window.innerWidth;
      const cowWidth = root.getBoundingClientRect().width;
      minX = EDGE_MARGIN;
      maxX = Math.max(minX, 100 - EDGE_MARGIN - (cowWidth / fieldWidth) * 100);
    };
    measure();

    // A static scene under reduced motion: the cow simply stands there. She is
    // still a button, so she can still be asked to moo.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      showFrame(STAND_INDEX);
      root.style.setProperty('--cow-x', `${(Math.min(28, maxX) / 100) * fieldWidth}px`);
      return;
    }

    let x = minX + Math.random() * (maxX - minX);
    let direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    let phase: Phase = 'grazing';
    let phaseEndsAt = performance.now() + rand(GRAZE_MS);
    let frameAt = performance.now();
    let step = 0;
    let raf = 0;
    let last = performance.now();
    let running = true;

    const place = () => {
      root.style.setProperty('--cow-x', `${(x / 100) * fieldWidth}px`);
      // The sprite is drawn facing LEFT, so flip it to walk the other way.
      root.style.setProperty('--cow-flip', direction === -1 ? '1' : '-1');
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(now - last, 100) / 1000; // clamp after a background pause
      last = now;

      if (now >= phaseEndsAt) {
        if (phase === 'walking') {
          phase = 'grazing';
          phaseEndsAt = now + rand(GRAZE_MS);
        } else {
          phase = 'walking';
          phaseEndsAt = now + rand(WALK_MS);
          // Pick a direction that keeps the cow on the field.
          direction = x < minX + 8 ? 1 : x > maxX - 8 ? -1 : Math.random() < 0.5 ? 1 : -1;
        }
        step = 0;
        frameAt = now;
      }

      if (phase === 'walking') {
        x += direction * WALK_SPEED * dt;
        if (x <= minX) {
          x = minX;
          direction = 1;
        } else if (x >= maxX) {
          x = maxX;
          direction = -1;
        }
        if (now - frameAt >= WALK_FRAME_MS) {
          frameAt = now;
          step = (step + 1) % COW_WALK.length;
        }
        showFrame(WALK_START + step);
      } else {
        if (now - frameAt >= CHEW_FRAME_MS) {
          frameAt = now;
          step = (step + 1) % COW_EAT.length;
        }
        showFrame(EAT_START + step);
      }

      place();
    };

    place();
    raf = requestAnimationFrame(tick);

    // Don't animate a tab nobody is looking at.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (!running) {
          running = true;
          last = performance.now();
          // Push the phase deadline out by however long we were away.
          phaseEndsAt = performance.now() + 2000;
          frameAt = performance.now();
          raf = requestAnimationFrame(tick);
        }
      } else if (running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onResize = () => {
      measure();
      x = Math.min(Math.max(x, minX), maxX);
      place();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="cow" ref={rootRef}>
      <button type="button" className="cow-button" onClick={onMoo} aria-label="Pet the cow">
        <span className="cow-sprite" aria-hidden="true">
          {FRAMES.map((frame, i) => (
            <span
              className="cow-frame"
              key={i}
              ref={(el) => {
                frameRefs.current[i] = el as unknown as HTMLDivElement;
              }}
              style={{ display: i === STAND_INDEX ? 'block' : 'none' }}
            >
              {toRuns(frame).map((run) => (
                <i
                  key={`${run.y}-${run.x}`}
                  style={{
                    left: `calc(${run.x} * var(--cow-px))`,
                    top: `calc(${run.y} * var(--cow-px))`,
                    width: `calc(${run.w} * var(--cow-px))`,
                    height: 'var(--cow-px)',
                    background: PALETTE[run.key],
                  }}
                />
              ))}
            </span>
          ))}
        </span>
      </button>

      {/* Visible confirmation, so the moo lands for anyone with sound off. */}
      <span className="cow-moo" data-visible={speaking} aria-live="polite">
        {speaking ? 'Moooo' : ''}
      </span>
    </div>
  );
}

export { COW_W, COW_H };
