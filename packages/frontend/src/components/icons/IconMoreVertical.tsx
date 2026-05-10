import type { IconProps } from './IconWrapper';

export default function IconMoreVertical({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <circle cx="12" cy="6" r="2"/>
      <circle cx="12" cy="12" r="2"/>
      <circle cx="12" cy="18" r="2"/>
    </svg>
  );
}
