import { Link } from 'react-router';
import { EmptyState } from '../components/ui/Feedback';

export function NotFoundPage() {
  return (
    <div className="page">
      <div className="card">
        <EmptyState
          title="Página não encontrada"
          description="O endereço acessado não existe ou você não tem acesso a ele."
          action={
            <Link to="/" className="btn btn-primary btn-sm">
              Ir para o início
            </Link>
          }
        />
      </div>
    </div>
  );
}
