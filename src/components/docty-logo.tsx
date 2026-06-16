import { cn } from '@/lib/utils';

interface DoctyLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function DoctyLogo({ className, showText = true, size = 'md' }: DoctyLogoProps) {
  const sizes = {
    sm: { icon: 32, text: 'text-lg' },
    md: { icon: 40, text: 'text-xl' },
    lg: { icon: 56, text: 'text-3xl' },
  };

  const { icon, text } = sizes[size];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Docty Medical Cross Icon */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Top pill - Red */}
        <rect x="35" y="5" width="30" height="35" rx="15" fill="#FE065C" />
        {/* Bottom pill - Red */}
        <rect x="35" y="60" width="30" height="35" rx="15" fill="#FE065C" />
        {/* Left pill - Blue */}
        <rect x="5" y="35" width="35" height="30" rx="15" fill="#0BB8FC" />
        {/* Right pill - Blue */}
        <rect x="60" y="35" width="35" height="30" rx="15" fill="#0BB8FC" />
        {/* Center white cross */}
        <rect x="40" y="25" width="20" height="50" rx="4" fill="white" />
        <rect x="25" y="40" width="50" height="20" rx="4" fill="white" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn('font-bold tracking-tight', text)}>
            <span style={{ color: '#FE065C' }}>Docty</span>
            <span style={{ color: '#0BB8FC' }}>.Clinics</span>
          </span>
          <span className="text-[10px] text-muted-foreground tracking-wider uppercase mt-0.5">
            Your Neighbourhood Clinics
          </span>
        </div>
      )}
    </div>
  );
}
