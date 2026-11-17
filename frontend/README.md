# Barbearia Hélios — Frontend

Aplicação web em React 19, TypeScript e Vite que consome a API do [`backend/`](../backend/).

## Como rodar

Com a API rodando em `http://localhost:3333`:

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Para apontar para outra API, crie um `.env.local` com `VITE_API_URL=http://endereco-da-api` (veja o `.env.example`). A origem do frontend precisa estar no `CORS_ORIGIN` do backend (o padrão já é `http://localhost:5173`).

Outros comandos: `npm run build` (gera `dist/`), `npm run preview` (serve o build) e `npm run lint`.

## Páginas

| Rota | Quem acessa | O que faz |
|---|---|---|
| `/login` | quem não está logado | Entrar e criar conta no mesmo formulário |
| `/agendar` | cliente | Escolhe serviço, profissional, dia e horário; confirma com observações |
| `/meus-agendamentos` | cliente | Próximos horários e histórico; cancela até 1h antes |
| `/agenda` | barbeiro e dono | Agenda do dia com janelas livres. O barbeiro vê a própria; o dono vê a de todos e filtra por profissional. Concluir, marcar falta, cancelar |
| `/painel` | dono | Atendimentos, faturamento, ticket médio, faltas, desempenho por profissional, serviços mais pedidos, status, clientes frequentes e histórico |

`/` leva cada papel para a sua página inicial. Uma rota de outro papel redireciona para a página inicial do papel atual.

## Estrutura

```
src/
  components/
    layout/      AppLayout (estrutura) e Sidebar (retrátil no desktop, gaveta no celular)
    routing/     ProtectedRoute, PublicOnlyRoute, HomeRedirect
    ui/          Brand, Avatar, StatusBadge, PageHeader, Feedback (spinner, alertas, vazio)
  contexts/      AuthProvider (sessão) e ThemeProvider (claro/escuro)
  hooks/         useAuth, useTheme, useAsync, useNow, useMediaQuery
  pages/         uma pasta por tela, cada uma com seu CSS module
  services/      http.ts (fetch nativo) e um service por recurso da API
  types/         tipos espelhando as respostas da API
  utils/         formatação de datas/valores, navegação por papel, storage
  styles/        global.css: tokens de cor (tema claro/escuro) e classes base
```

## Autenticação

- **Login e cadastro:** devolvem o access token, que fica **só em memória**. O refresh token fica no cookie httpOnly definido pela API.
- **Ao abrir o app:** o `AuthProvider` chama `POST /auth/refresh` para restaurar a sessão a partir do cookie.
- **Token expirado:** quando a API responde 401, o `http.ts` renova o token uma vez e repete a requisição. Se a renovação falhar, a sessão é encerrada e o usuário volta para o login.
- **Rotas protegidas:** o `ProtectedRoute` lê o contexto de autenticação e recebe os papéis permitidos.

## Responsividade

- **Até 900px:** a sidebar vira uma gaveta com botão de menu na barra do topo.
- **Grades e tabelas:** as grades passam para uma coluna, e as tabelas ganham rolagem horizontal própria.
- **Preferências:** o tema e o estado recolhido da sidebar ficam salvos no `localStorage`.
