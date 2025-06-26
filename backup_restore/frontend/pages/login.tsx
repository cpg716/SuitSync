import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useToast } from '../components/ToastContext';
import Card from '../components/ui/Card';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { error: toastError, success } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      success('Login successful');
      router.push('/');
    } catch (err) {
      setError('Invalid email or password');
      toastError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(to_bottom_right,_#dbeafe_0%,_#fff_50%,_#bfdbfe_100%)] dark:bg-[var(--bg-dark)] transition-colors">
      <Card className="w-full max-w-md p-8 bg-white shadow-2xl border border-accent">
        <div className="flex flex-col items-center mb-6">
          <img src="/suitsync-logoh.png" alt="SuitSync Logo" className="h-20 w-auto mb-2 drop-shadow-lg" />
          <img src="/riverside-logo-full.jpg" alt="Riverside Logo" className="h-10 w-auto mb-2" />
          <h1 className="text-2xl font-bold mb-2 text-primary">Sign in to SuitSync</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Login form">
          <label className="block">
            <span className="text-sm">Email</span>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="mt-1 w-full"
              aria-label="Email"
            />
          </label>
          <label className="block">
            <span className="text-sm">Password</span>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="mt-1 w-full"
              aria-label="Password"
            />
          </label>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <Button type="submit" className="w-full bg-accent text-white text-lg font-bold py-3 rounded-lg shadow-lg hover:bg-accent/90 transition" disabled={loading} aria-busy={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
        <div className="my-6 flex items-center justify-center">
          <span className="border-t border-gray-200 flex-grow mr-3" />
          <span className="text-gray-400 text-xs">or</span>
          <span className="border-t border-gray-200 flex-grow ml-3" />
        </div>
        <button
          type="button"
          className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-3 px-4 rounded-lg shadow-lg mt-2 transition"
          onClick={() => window.location.href = 'http://localhost:3000/ls/login'}
          aria-label="Sign in with Lightspeed"
        >
          Sign in with Lightspeed
        </button>
        <div className="mt-2 text-xs text-gray-500 text-center">
          Staff login uses your SuitSync account. Lightspeed login connects to your Lightspeed X-Series account.
        </div>
      </Card>
    </div>
  );
}

(LoginPage as any).getLayout = (page: React.ReactNode) => page; 