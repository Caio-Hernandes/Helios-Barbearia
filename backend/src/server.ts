import { env } from './config/env';
import { app } from './app';
import { prisma } from './shared/database/prisma';
import { startAutoCompleteJob } from './jobs/auto-complete.job';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 API da Barbearia Hélios rodando em http://localhost:${env.PORT}`);
});

const stopAutoComplete = startAutoCompleteJob();

async function shutdown(signal: string) {
  console.log(`\n${signal} recebido, encerrando...`);
  stopAutoComplete();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
