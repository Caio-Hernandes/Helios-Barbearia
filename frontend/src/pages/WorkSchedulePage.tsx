import { useState } from 'react';
import { TimeOffPanel } from '../components/schedule/TimeOffPanel';
import { WorkingHoursEditor } from '../components/schedule/WorkingHoursEditor';
import { PageHeader } from '../components/ui/PageHeader';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/useAuth';
import { barbersService } from '../services/barbers.service';
import type { Barber } from '../types';

const NO_BARBERS: Barber[] = [];

/**
 * Expediente e folgas. O dono escolhe o profissional e edita tudo;
 * o barbeiro vê o próprio expediente e gerencia as próprias folgas.
 */
export function WorkSchedulePage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const barbers = useAsync(() => (isOwner ? barbersService.list() : Promise.resolve(NO_BARBERS)), [isOwner]);
  // O dono também atende: começa pela própria agenda
  const [selected, setSelected] = useState(user?.id ?? '');

  const barberId = isOwner ? selected : (user?.id ?? '');
  if (!barberId) return null;

  return (
    <div className="page">
      <PageHeader
        title="Expediente"
        description={
          isOwner ? 'Horários de atendimento e folgas de cada profissional.' : 'Seus horários de atendimento e suas folgas.'
        }
        actions={
          isOwner && (
            <select
              className="input"
              style={{ minWidth: 220, width: 'auto' }}
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              aria-label="Profissional"
            >
              {barbers.data?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.id === user?.id ? ' (você)' : ''}
                </option>
              ))}
            </select>
          )
        }
      />

      <WorkingHoursEditor barberId={barberId} editable={isOwner} />
      <TimeOffPanel barberId={barberId} />
    </div>
  );
}
