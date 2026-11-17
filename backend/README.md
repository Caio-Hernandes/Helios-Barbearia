# Barbearia Hélios — API de agendamento

API em Node.js, Express 5 e TypeScript, com PostgreSQL e Prisma. Organizada em camadas (routes → controller → service → repository), separadas por módulo.

## Como rodar

Pré-requisitos: Node 20+ e Docker. Os comandos rodam dentro de `backend/`. O `docker-compose.yml` fica na raiz do repositório.

```bash
cd backend
npm install
cp .env.example .env          # depois gere segredos JWT reais (veja o comentário no arquivo)
npm run db:up                 # sobe o Postgres no Docker
npm run db:migrate            # aplica as migrations
npm run db:seed               # cria serviços, usuários e expedientes
npm run dev                   # http://localhost:3333
```

Outros comandos: `npm run build && npm start` (produção), `npm run db:studio` (abre o Prisma Studio para ver os dados) e `npm run db:reset` (apaga o banco, recria e roda o seed).

## Dados do seed

Todos os usuários usam a senha `Helios@2026`.

| Usuário | E-mail | Papel |
|---|---|---|
| Hélio | helio@helios.test | OWNER (também atende) |
| Rafael | rafael@helios.test | EMPLOYEE |
| Bruno | bruno@helios.test | EMPLOYEE |
| Cliente Teste | cliente@helios.test | CLIENT |

Expediente dos barbeiros: terça a sábado, 09:00–12:00 e 13:00–19:00. Para mudar, use `PUT /barbers/:id/working-hours`.

| Catálogo | Preço | Duração |
|---|---|---|
| Barba | R$ 50 | 30 min |
| Corte na tesoura | R$ 50 | 45 min |
| Corte na máquina | R$ 50 | 30 min |
| Corte na tesoura e Barba | R$ 80 | 75 min |
| Corte na máquina e Barba | R$ 80 | 60 min |

Os preços ficam em **centavos** (`priceCents: 5000` = R$ 50,00).

## Autenticação

- **Access token** (JWT, 15 min): vem no corpo da resposta de login, cadastro e refresh. Envie no header `Authorization: Bearer <token>`.
- **Refresh token** (JWT, 15 dias): fica num cookie `refresh_token` **httpOnly**, `SameSite=Strict`, com `path=/auth`. Em produção ele também é `Secure`. O JavaScript do navegador não consegue ler esse cookie.
- `POST /auth/refresh` gera um par novo de tokens (rotação). Por isso a sessão expira após **15 dias sem uso**.
- O refresh token **não é salvo no banco** (é stateless). Consequência: o logout só apaga o cookie daquele navegador, e não há como revogar um token roubado antes de ele expirar. Se um dia precisar de "sair de todos os dispositivos", basta adicionar uma tabela de sessões.

## Regras de agendamento

Os valores ficam em `src/domain/scheduling/scheduling.rules.ts`.

- Antecedência **mínima de 1 hora** e **máxima de 30 dias**. Horários no passado são recusados.
- Os horários seguem uma grade de 15 em 15 minutos e precisam caber inteiros dentro do expediente.
- O **cliente** pode cancelar até **1 hora antes**. O barbeiro do agendamento e o dono podem cancelar a qualquer momento.
- Um barbeiro não pode ter dois agendamentos ativos sobrepostos. Isso é garantido também pelo banco (constraint `appointment_no_overlap`), o que cobre reservas simultâneas.
- Um cliente também não pode ter dois agendamentos ao mesmo tempo.
- Só é possível criar um bloqueio (folga) num período sem agendamentos ativos.
- Fuso de referência: `America/Sao_Paulo`. As datas são gravadas em UTC (`timestamptz`).

## Rotas

Público = não precisa de token.

### Auth
| Método | Rota | Acesso | Corpo |
|---|---|---|---|
| POST | `/auth/register` | público (cria CLIENT) | `{ name, email, password, phone? }` |
| POST | `/auth/login` | público | `{ email, password }` |
| POST | `/auth/refresh` | cookie | — |
| POST | `/auth/logout` | — | — |
| GET | `/auth/me` | logado | — |

### Serviços
| Método | Rota | Acesso |
|---|---|---|
| GET | `/catalog` | público. `?includeInactive=true` é só do OWNER: sem login responde 401, outro papel responde 403 |
| POST | `/catalog` | OWNER. Corpo: `{ name, priceCents, durationMinutes, active? }` |
| PATCH | `/catalog/:catalogId` | OWNER. Mesmos campos, todos opcionais |

### Barbeiros e agenda
| Método | Rota | Acesso |
|---|---|---|
| GET | `/barbers` | público |
| GET | `/barbers/:barberId/availability?date=YYYY-MM-DD` | público. `date` é opcional: sem ela, vale o dia de hoje (fuso de São Paulo). Devolve `windows`: as janelas livres do dia, independentes do serviço (ex.: `09:00–10:00`, `11:15–12:00`) |
| GET | `/barbers/:barberId/availability?date=YYYY-MM-DD&catalogId=...` | público. Devolve `slots`: os horários de início em que **aquele** serviço cabe inteiro (a duração muda o resultado) |
| GET | `/barbers/:barberId/working-hours` | público |
| PUT | `/barbers/:barberId/working-hours` | OWNER. Corpo: `{ workingHours: [{ weekday, startTime, endTime }] }` (substitui o expediente inteiro) |
| GET | `/barbers/:barberId/time-offs` | OWNER, ou o próprio barbeiro |
| POST | `/barbers/:barberId/time-offs` | OWNER, ou o próprio barbeiro. Corpo: `{ startsAt, endsAt, reason? }` |
| DELETE | `/barbers/:barberId/time-offs/:timeOffId` | OWNER, ou o próprio barbeiro |

### Agendamentos
| Método | Rota | Acesso |
|---|---|---|
| POST | `/appointments` | CLIENT. Corpo: `{ barberId, catalogId, startsAt, notes? }` |
| GET | `/appointments?date=&from=&to=&barberId=&status=` | CLIENT vê os seus · EMPLOYEE vê os atribuídos a si · OWNER vê todos |
| GET | `/appointments/:appointmentId` | quem participa do agendamento, ou o OWNER |
| PATCH | `/appointments/:appointmentId/cancel` | cliente (até 1h antes), barbeiro do agendamento ou OWNER |
| PATCH | `/appointments/:appointmentId/status` | barbeiro do agendamento ou OWNER. Corpo: `{ status: "COMPLETED" \| "NO_SHOW" }`, só depois do horário de início |

### Usuários
| Método | Rota | Acesso |
|---|---|---|
| GET | `/users?role=` | OWNER |
| POST | `/users/employees` | OWNER. Cria um funcionário: `{ name, email, password, phone? }` |

## Testando no Insomnia

A coleção pronta está em [`insomnia/helios.insomnia.json`](insomnia/helios.insomnia.json). Ela tem 53 requisições, organizadas em 7 pastas.

**Para um teste rápido**, use a pasta **0. Ciclo completo (novo cliente)**, que é independente das outras. Rode de cima para baixo:

1. o atendente (Rafael) faz login;
2. ele vê a própria agenda do dia, que deve estar vazia;
3. um novo cliente se cadastra (e-mail aleatório);
4. o cliente faz login;
5. ele vê o catálogo;
6. ele vê os barbeiros;
7. ele vê os horários livres do Rafael;
8. ele agenda o primeiro horário;
9. o Rafael vê a agenda de novo, agora com o agendamento, o cliente e a observação.

**Importar:** no Insomnia (versão 9 ou mais nova), vá em *Import* (ou arraste o arquivo para a janela), escolha o arquivo e confirme. Ele aparece como a coleção **Barbearia Hélios API**. Se você já tinha importado uma versão anterior, apague a coleção antiga antes.

**Para testar tudo, rode as demais pastas na ordem:**

1. **Auth:** rode primeiro os três logins (cliente, Rafael e Hélio). Os tokens vão para o ambiente sozinhos, então não precisa copiar nada.
2. **Catálogo:** "Listar catálogo" preenche o `catalog_id`, que aponta para "Corte na tesoura e Barba".
3. **Barbeiros e agenda:** "Listar barbeiros" preenche o `barber_id` (Rafael) e o `helio_id`. "Agenda livre do Rafael (sem serviço)" mostra as janelas livres. "Horários do Rafael para um serviço" guarda o primeiro horário em que o serviço cabe.
4. **Agendamentos:** "Criar agendamento" reserva esse horário. As requisições seguintes usam o `appointment_id` criado.
5. **Usuários:** rotas exclusivas do Hélio.
6. **Casos de erro:** cada requisição demonstra uma regra, e o status esperado está no nome.

**Variáveis** (no ícone de ambiente, *Base Environment*):

- `base_url`: endereço da API (padrão `http://localhost:3333`).
- `date`: dia usado na disponibilidade e na agenda. **Precisa ser uma terça a sábado dentro dos próximos 30 dias.**
- As demais (`token_*`, `*_id`, `slot_starts_at`) começam vazias. Quem as preenche é um *after-response script* (aba **Scripts** da requisição) quando a resposta dá certo. Se uma requisição reclamar de variável vazia ou de id inválido, rode antes a requisição que a preenche:

  | Variável | Preenchida por |
  |---|---|
  | `token_cliente`, `token_rafael`, `token_helio` | os três logins |
  | `catalog_id` | Listar catálogo |
  | `created_catalog_id` | Criar item (Hélio) |
  | `barber_id`, `helio_id` | Listar barbeiros |
  | `slot_starts_at` | Horários do Rafael para um serviço |
  | `time_off_id` | Criar bloqueio |
  | `appointment_id` | Criar agendamento |

**Observações:**

- O access token dura 15 minutos. Quando expirar (resposta 401), basta rodar o login de novo.
- "Refresh token" usa o cookie que o Insomnia guarda. Esse cookie é sempre o do **último** login feito.
- "Criar item (Hélio)" responde 409 na segunda vez, porque o nome se repete. "Criar agendamento" também dá 409 se você reenviar sem rodar a disponibilidade de novo, porque o horário já foi reservado.
- "Marcar como concluído" responde 422 antes do horário do atendimento. Isso é esperado.

## Erros

Todas as respostas de erro seguem o formato `{ "error": "mensagem", "details"?: ... }`.

| Código | Quando |
|---|---|
| 400 | validação (Zod), incluindo campos ou parâmetros de query não previstos (ex.: `role` no cadastro) |
| 401 | não autenticado ou token inválido |
| 403 | sem permissão (a API recusa o que o papel não pode pedir; nunca ignora em silêncio) |
| 404 | não encontrado |
| 409 | conflito de horário ou registro duplicado |
| 422 | regra de negócio (antecedência, expediente, prazo de cancelamento) |

## Estrutura

```
prisma/              schema, migrations e seed
src/
  config/env.ts      variáveis de ambiente validadas com Zod
  shared/            infraestrutura: prisma client, erros, middlewares (auth, authorize, validate, erros)
  modules/           recursos da API: cada um tem routes, controller, service e repository
    auth/            login, cadastro, refresh, logout, JWT
    users/           usuários e funcionários
    catalog/         catálogo de serviços da barbearia (tabela Catalog, rota /catalog)
    barbers/         barbeiros, expediente, bloqueios, disponibilidade
    appointments/    agendamentos
  domain/            regras de negócio compartilhadas, sem rotas (usadas pelos services de modules/)
    scheduling/      regras de agenda e cálculo de disponibilidade
  app.ts             montagem do Express
  server.ts          inicialização
```
