import { AUTO_COMPLETE_INTERVAL_MINUTES } from '../domain/scheduling/scheduling.rules';
import { appointmentsService } from '../modules/appointments/appointments.service';

/**
 * Conclui automaticamente os horários vencidos que ninguém marcou.
 * Roda ao subir a API e depois a cada AUTO_COMPLETE_INTERVAL_MINUTES.
 * É idempotente: várias instâncias rodando ao mesmo tempo não causam problema.
 * Retorna uma função para parar o job.
 */
export function startAutoCompleteJob(): () => void {
  const run = async () => {
    try {
      const count = await appointmentsService.autoCompleteOverdue();
      if (count > 0) console.log(`✔ ${count} agendamento(s) vencido(s) concluído(s) automaticamente`);
    } catch (error) {
      console.error('Falha ao concluir agendamentos vencidos:', error);
    }
  };

  void run();
  const timer = setInterval(run, AUTO_COMPLETE_INTERVAL_MINUTES * 60_000);
  return () => clearInterval(timer);
}
