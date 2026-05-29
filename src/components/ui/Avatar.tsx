import { cn } from '../../lib/cn';
import { initials } from '../../lib/formatters';

export function Avatar({ name, src, size = 32, className }: { name: string; src?: string; size?: number; className?: string }) {
  const sizeStyle = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (src) {
    return <img src={src} alt={name} style={sizeStyle} className={cn('rounded-full object-cover', className)} />;
  }
  return (
    <span
      style={sizeStyle}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-navy-100 text-navy-800 font-semibold dark:bg-navy-800 dark:text-cream-100',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
