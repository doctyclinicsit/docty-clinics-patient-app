import { cn } from '@/lib/utils';

interface DoctyLogoProps {
  className?: string;
  centered?: boolean;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function DoctyLogo({
  className,
  centered = false,
  showText = true,
  size = 'md',
}: DoctyLogoProps) {
  const sizes = {
    sm: { width: 132, caption: 'text-[8px]' },
    md: { width: 172, caption: 'text-[10px]' },
    lg: { width: 240, caption: 'text-xs' },
  };

  const { width, caption } = sizes[size];

  return (
    <div className={cn('flex flex-col leading-none', centered ? 'items-center' : 'items-start', className)}>
      <img
        src="/docty-logo-full.png"
        alt="Docty Clinics"
        width={width}
        className="h-auto object-contain"
      />

      {showText && (
        <span
          className={cn(
            'mt-0.5 text-muted-foreground tracking-wider uppercase',
            centered ? 'ml-0' : 'ml-[42px]',
            caption
          )}
        >
          Your Neighbourhood Clinic
        </span>
      )}
    </div>
  );
}
