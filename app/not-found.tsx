import Link from 'next/link';
import Header from '@/components/Header';

// One 404 page for every unknown address, including the private ones when you are not allowed in.
export default function NotFound() {
  return (
    <>
      <Header locale="en-us" minimal />
      <main id="main" className="hero hero-bands" style={{ minHeight: 'calc(100vh - 72px)' }}>
        <div className="container" style={{ maxWidth: 560 }}>
          <h1 style={{ marginTop: 32 }}>404</h1>
          <p className="lead">This page doesn’t exist.</p>
          <p><Link className="btn" href="/">The AI Certification</Link></p>
        </div>
      </main>
    </>
  );
}
