import type { IconProps } from './IconWrapper';

export default function IconMinus({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4"/>
    </svg>
  );
}
