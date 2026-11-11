// The medal logo turning: the loading indicator used everywhere (pages, lists, buttons).
export default function Spinner({ size = 18, label }: { size?: number; label?: string }) {
  return (
    <img
      className="spinner"
      src="/assets/mark.svg"
      alt={label ?? ''}
      role={label ? 'status' : undefined}
      width={size}
      height={size}
      style={{ width: size, height: 'auto' }}
    />
  );
}
