import Link from 'next/link';

interface BrandProps {
  size?: 'sm' | 'md' | 'lg';
  asLink?: boolean;
}

export function Brand({ size = 'sm', asLink = true }: BrandProps) {
  const mark = (
    <span className="inline-flex items-center gap-2">
      <BrandMark size={size} />
      <span
        className={`font-semibold tracking-tight text-foreground ${
          size === 'lg' ? 'text-xl' : size === 'md' ? 'text-base' : 'text-sm'
        }`}
      >
        명함
        <span className="text-primary">.</span>
      </span>
    </span>
  );
  if (asLink) {
    return (
      <Link href="/" className="inline-flex items-center transition-opacity hover:opacity-80">
        {mark}
      </Link>
    );
  }
  return mark;
}

function BrandMark({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 26 : size === 'md' ? 20 : 16;
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="text-primary"
    >
      <rect
        x="2"
        y="5"
        width="20"
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <line
        x1="5.5"
        y1="10.5"
        x2="11.5"
        y2="10.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1="5.5"
        y1="13.5"
        x2="9"
        y2="13.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="17.5" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}
