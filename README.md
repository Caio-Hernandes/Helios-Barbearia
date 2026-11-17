# Barbearia Hélios

Sistema de agendamento da Barbearia Hélios.

| Pasta | O que é |
|---|---|
| [`backend/`](backend/) | API REST em Node.js, Express, TypeScript, PostgreSQL e Prisma |
| [`frontend/`](frontend/) | Aplicação web em React, TypeScript e Vite |
| `docker-compose.yml` | Postgres para desenvolvimento |

## Rodando tudo localmente

```bash
docker compose up -d postgres                                    # banco
cd backend && npm install && npm run db:migrate && npm run db:seed && npm run dev    # API em http://localhost:3333
cd frontend && npm install && npm run dev                        # web em http://localhost:5173
```

Detalhes da API (rotas, regras de agendamento, usuários do seed, coleção do Insomnia) estão em [`backend/README.md`](backend/README.md).
