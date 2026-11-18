import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import type { Role } from '../../types';
import { homePathFor } from '../../utils/navigation';
import { FullPageLoader } from '../ui/Feedback';

/**
 * Libera as rotas filhas só para usuários logados (e, se informado, com um dos papéis).
 * Sem login: vai para /login lembrando a página pedida.
 * Papel sem acesso: volta para a página inicial do próprio papel.
 */
export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />;

  return <Outlet />;
}

/**
 * Páginas só para quem NÃO está logado (login/cadastro).
 * Ao logar, volta para a página que a pessoa tentou abrir (state.from) ou para a inicial do papel.
 */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;
  if (user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== '/login' ? from : homePathFor(user.role)} replace />;
  }

  return children;
}

/** "/" leva cada papel para a sua página inicial. */
export function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />;
}
