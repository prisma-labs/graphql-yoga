import { ReactElement, ReactNode } from 'react';
import { cn } from '@theguild/components';

const TimeToSeconds = {
  fast: '20s',
  normal: '40s',
  slow: '80s',
};

export function InfiniteMovingCards({
  children,
  direction = 'left',
  speed = 'fast',
  pauseOnHover = true,
  className,
}: {
  children: ReactNode;
  direction?: 'left' | 'right';
  speed?: 'fast' | 'normal' | 'slow';
  pauseOnHover?: boolean;
  className?: string;
}): ReactElement {
  return (
    <div
      className={cn(
        '[mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]',
        className,
      )}
    >
      <ul
        className={cn(
          'flex gap-2 py-1 w-max animate-scroll',
          pauseOnHover && 'hover:[animation-play-state:paused]',
        )}
        style={{
          ['--animation-duration' as string]: TimeToSeconds[speed],
          ['--animation-direction' as string]: direction === 'left' ? 'forwards' : 'reverse',
        }}
      >
        {children}
        {children}
      </ul>
    </div>
  );
}
