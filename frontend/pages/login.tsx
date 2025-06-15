import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ToastContext';

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded shadow w-full max-w-sm space-y-4"
        aria-label="Login form"
      >
        <h1 className="text-2xl font-bold mb-2 text-primary">Sign in to SuitSync</h1>
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
        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>
    </div>
  );
} 