import React from 'react';
import { ArrowRight, BookOpen, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
export default function Auth({
  onClose
}) {
  const [mode, setMode] = React.useState('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const {
      data,
      error: authError
    } = mode === 'signin' ? await supabase.auth.signInWithPassword({
      email,
      password
    }) : await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });
    setBusy(false);
    if (authError) return setError(authError.message);
    if (data.session) onClose();else setMessage('Check your email for a confirmation link, then sign in.');
  }
  return <div className="modal-backdrop" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <div className="modal auth-modal">
      <button className="icon-button auth-close" onClick={onClose} aria-label="Close">
        <X size={21} />
      </button>
      <div className="auth-symbol">
        <BookOpen size={25} />
      </div>
      <div className="eyebrow muted">WELCOME TO SMART RESRVE</div>
      <h2>
        {mode === 'signin' ? 'Good to have you back.' : 'Make yourself at home.'}
      </h2>
      <p>
        {mode === 'signin' ? 'Sign in to manage your facility bookings.' : 'Create an account to reserve college facilities.'}
      </p>
      <form onSubmit={submit}>
        <label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
        <label>Password<input type="password" minLength={6} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 6 characters" required /></label>
        {error && <div className="notice error">
          {error}
        </div>}
        {message && <div className="notice success">
          {message}
        </div>}
        <button className="button button-dark auth-submit" disabled={busy}>
          {busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          {" "}
          <ArrowRight size={17} />
        </button>
      </form>
      <div className="auth-switch">
        {mode === 'signin' ? 'New here?' : 'Already have an account?'}
        {" "}
        <button onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin');
          setError('');
          setMessage('');
        }}>
          {mode === 'signin' ? 'Create an account' : 'Sign in'}
        </button>
      </div>
    </div>
  </div>;
}
