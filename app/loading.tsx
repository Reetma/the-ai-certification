import Spinner from '@/components/Spinner';

// Shown while any page loads: the medal logo turning, instead of a frozen screen.
export default function Loading() {
  return (
    <div className="page-loading" role="status" aria-label="Loading">
      <Spinner size={56} />
    </div>
  );
}
