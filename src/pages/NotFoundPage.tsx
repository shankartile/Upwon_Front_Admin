import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <p className="text-[10px] uppercase tracking-[0.2em] text-orange-500">Lost</p>
      <h1 className="font-display text-5xl mt-2 text-charcoal">404</h1>
      <p className="text-sm text-charcoal-light mt-2">The page you’re looking for isn’t in the CMS.</p>
      <Link to="/dashboard" className="mt-6">
        <Button variant="orange">Back to dashboard</Button>
      </Link>
    </div>
  );
}
