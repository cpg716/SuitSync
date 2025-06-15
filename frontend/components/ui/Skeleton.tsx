export default function Skeleton({
  className = 'h-6 w-full',
}: { className?: string }) {
  return <div className={`bg-neutral-200 animate-pulse rounded ${className}`} />;
}