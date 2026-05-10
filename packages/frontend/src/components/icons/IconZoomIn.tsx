import type { IconProps } from './IconWrapper';

export default function IconZoomIn({ className }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM12 8v4m0 0v4m0-4h4m-4 0H8"/>
    </svg>
  );
}
