import { LoaderCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Brand } from '../components/ui/Brand';
import { ErrorAlert } from '../components/ui/Feedback';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../services/http';
import { homePathFor } from '../utils/navigation';
import styles from './AuthPage.module.css';

type Mode = 'login' | 'register';

/** Login e cadastro na mesma página, alternando o formulário. */
export function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === 'register';

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = isRegister
        ? await register({ name, email, password, phone: phone.trim() || undefined })
        : await login({ email, password });
      navigate(from && from !== '/login' ? from : homePathFor(user.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Brand />

        <form className={styles.card} onSubmit={handleSubmit} noValidate>
          <div className={styles.heading}>
            <h1>{isRegister ? 'Criar conta' : 'Entrar'}</h1>
            <p className="muted">
              {isRegister ? 'Cadastre-se para agendar seu horário.' : 'Acesse para agendar ou ver sua agenda.'}
            </p>
          </div>

          {error && <ErrorAlert message={error} />}

          {isRegister && (
            <label className="field">
              <span className="label">Nome</span>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                autoComplete="name"
                required
              />
            </label>
          )}

          <label className="field">
            <span className="label">E-mail</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              autoComplete="email"
              required
            />
          </label>

          {isRegister && (
            <label className="field">
              <span className="label">
                Telefone <span className="subtle">(opcional)</span>
              </span>
              <input
                className="input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                autoComplete="tel"
              />
            </label>
          )}

          <label className="field">
            <span className="label">Senha</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? 'Mínimo de 8 caracteres' : 'Digite sua senha'}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
            />
          </label>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting && <LoaderCircle size={18} className="spin" />}
            {isRegister ? 'Criar conta' : 'Entrar'}
          </button>

          <p className={styles.switch}>
            {isRegister ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
            <button type="button" onClick={() => switchMode(isRegister ? 'login' : 'register')}>
              {isRegister ? 'Entrar' : 'Criar conta'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
