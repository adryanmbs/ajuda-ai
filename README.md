# Ajuda Aí

Plataforma de gestão de voluntariado: instituições sociais publicam demandas (data, local,
vagas) e pessoas da comunidade se inscrevem. Projeto Integrador II (CSI991, UFOP 2026/2),
Arthur Quintanilha Duarte e Adryan Martins Batista dos Santos.

- Front-end: React + Vite (`web/`)
- API REST: Node.js + Express (`server/`)
- Banco: PostgreSQL (ou PGlite, o Postgres embutido, quando `DATABASE_URL` não está definido)

O planejamento (arquitetura, rotas, telas e direção visual) está em [PLANEJAMENTO.md](PLANEJAMENTO.md).

## Rodar em desenvolvimento

Requisito: Node.js 22 ou mais recente. Não é preciso instalar banco de dados.

```bash
npm install
npm run seed   # cria dados de demonstração (apaga o que houver no banco; rode com a API parada)
npm run dev    # API em :3000 e site em http://localhost:5173
```

Contas de demonstração criadas pelo seed (senha `ajudaai123`):

| E-mail | Tipo |
|---|---|
| casalar@exemplo.com | Instituição |
| biblioteca@exemplo.com | Instituição |
| joana@exemplo.com | Voluntária |
| pedro@exemplo.com | Voluntário |

Sem SMTP configurado, os e-mails (nova inscrição, demanda alterada, redefinição de senha)
aparecem no terminal da API, inclusive o link de redefinição de senha.

## Testes

```bash
npm test
```

Testes de API com `node:test` + supertest num banco em memória: cadastro e LGPD, login,
permissões, filtros, limite de vagas (inclusive inscrições simultâneas), edição/cancelamento,
conclusão e painel de impacto, redefinição de senha e exclusão de conta.

## Produção

```bash
npm install
npm run build                       # gera web/dist
NODE_ENV=production JWT_SECRET=... DATABASE_URL=... npm start
```

O Express serve a API em `/api` e o site compilado no mesmo endereço. As tabelas são criadas
automaticamente na primeira execução (`server/src/schema.sql`). Variáveis disponíveis em
[server/.env.example](server/.env.example).

## Estrutura

```
server/src/
  app.js, index.js     montagem do Express e inicialização
  db.js, schema.sql    conexão (pg ou PGlite) e tabelas
  auth.js              JWT e controle de acesso
  email.js             envio de e-mails (SMTP ou console)
  routes/              auth, me, demandas, inscricoes, instituicoes
server/test/           testes da API
web/src/
  api.js, auth.jsx     cliente da API e sessão
  components/          layout, agenda de demandas, medidor de vagas, formulários
  pages/               uma página por tela
```
