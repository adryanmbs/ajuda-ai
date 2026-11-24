# Ajuda Aí — Planejamento da implementação (etapa 3d)

Baseado no Documento de Requisitos (RF01–RF10, UC-001–UC-008) e no Documento de Modelagem
(arquitetura, ER e rotas). Onde o Escopo e a Modelagem divergem (Angular/Firebase x
React/PostgreSQL), vale a Modelagem, que é a mais recente.

## 1. Stack (o mais simples possível)

| Camada    | Escolha                                   | Por quê |
|-----------|-------------------------------------------|---------|
| Front-end | React + Vite + React Router, CSS puro     | Sem framework de UI: um arquivo de tokens CSS basta. |
| API       | Node.js 22 + Express                      | Definido na modelagem. |
| Banco     | PostgreSQL via `pg` (produção) ou PGlite (dev/testes) | PGlite é o próprio Postgres rodando embutido: o projeto roda só com `npm install`, sem instalar banco. Com `DATABASE_URL` definido, usa um Postgres real. |
| SQL       | SQL puro parametrizado (`$1, $2…`)        | Sem ORM; atende "consultas SQL parametrizadas". |
| Validação | zod                                       | Validação no back-end com mensagens claras. |
| Auth      | bcryptjs + jsonwebtoken (JWT, 2 h)        | Conforme seção de segurança. |
| E-mail    | nodemailer (SMTP). Sem SMTP configurado, o e-mail é impresso no console | Falha no envio nunca derruba a operação principal. |
| Testes    | `node:test` + supertest, banco PGlite em memória | Nada a instalar além das dependências. |
| Deploy    | Um único processo: Express serve a API em `/api` e o build do React | Um servidor só (Render/Railway/EC2 + Postgres gerenciado). |

## 2. Estrutura de pastas

```
PI2/
├─ package.json            # workspaces + scripts dev/build/test/start
├─ server/
│  ├─ src/
│  │  ├─ index.js          # sobe o servidor (listen)
│  │  ├─ app.js            # monta o Express, rotas e tratador de erros
│  │  ├─ db.js             # conexão (pg ou PGlite), query() e transaction()
│  │  ├─ schema.sql        # tabelas do ER
│  │  ├─ auth.js           # gerar/verificar JWT, middlewares autenticar/exigirTipo
│  │  ├─ email.js          # enviarEmail() + modelos das mensagens
│  │  ├─ errors.js         # HttpError e helpers 400/401/403/404/409
│  │  ├─ validate.js       # helper para schemas zod
│  │  └─ routes/
│  │     ├─ auth.js        # /auth/*
│  │     ├─ me.js          # /me
│  │     ├─ demandas.js    # /demandas, /demandas/:id/*, /instituicoes/me/demandas
│  │     ├─ inscricoes.js  # /demandas/:id/inscricoes, /inscricoes/:id, /voluntarios/me/inscricoes
│  │     └─ instituicoes.js# /instituicoes/:id/impacto
│  ├─ scripts/seed.js      # dados de demonstração
│  └─ test/api.test.js
└─ web/
   ├─ index.html
   ├─ vite.config.js       # proxy /api -> localhost:3000
   └─ src/
      ├─ main.jsx, App.jsx (rotas)
      ├─ api.js            # fetch com token, erros padronizados
      ├─ auth.jsx          # AuthContext (usuário, login, logout)
      ├─ styles.css        # tokens e estilos
      ├─ components/       # Layout, DemandaItem, Vagas, Campo, Aviso, RotaProtegida
      └─ pages/            # uma página por tela (seção 5)
```

## 3. Banco de dados (fiel ao ER)

- `usuario(id uuid PK, email UK, senha_hash, tipo VOLUNTARIO|INSTITUICAO, consentimento_lgpd_em, criado_em)`
- `voluntario(usuario_id PK/FK, nome, contato, areas_interesse?)`
- `instituicao(usuario_id PK/FK, nome, descricao, area_atuacao, contato)`
- `token_redefinicao_senha(id, usuario_id FK, token_hash, expira_em, usado_em)`
- `demanda(id, instituicao_id FK, titulo, descricao, data, local, num_vagas, status ABERTA|CONCLUIDA|CANCELADA)`
- `inscricao(id, voluntario_id FK, demanda_id FK, criada_em, status ATIVA|CANCELADA)`
  + índice único parcial `(voluntario_id, demanda_id) WHERE status='ATIVA'` (sem inscrição dupla).

Todas as FKs com `ON DELETE CASCADE` (excluir conta remove os dados — LGPD).

Regras:
- Vagas disponíveis = `num_vagas − inscrições ATIVA`. A inscrição roda numa transação com
  `SELECT … FOR UPDATE` na demanda antes de contar.
- "Já ocorreu" = `data < agora`. Demanda que já ocorreu não pode ser editada nem cancelada;
  inscrição dela também não pode ser cancelada.
- Ao editar, `num_vagas` não pode ficar menor que o nº de inscritos ativos (409).
- Listagem pública: `status = ABERTA` e `data >= agora`. Esgotadas aparecem, sem botão de inscrição.
- Impacto: ações = demandas CONCLUIDA; voluntários = voluntários distintos com inscrição ATIVA nelas.

## 4. API (prefixo `/api`)

Erros sempre no formato `{ "erro": "mensagem" }` com 400/401/403/404/409.

| Método | Rota | Acesso | Notas |
|---|---|---|---|
| POST | /auth/cadastro/voluntario | Público | nome, email, senha, contato, areas_interesse?, aceite_lgpd → `{token, usuario}` |
| POST | /auth/cadastro/instituicao | Público | nome, email, senha, descricao, area_atuacao, contato, aceite_lgpd |
| POST | /auth/login | Público | email, senha → `{token, usuario}` |
| POST | /auth/esqueci-senha | Público | sempre 200 (não revela se o e-mail existe) |
| POST | /auth/redefinir-senha | Público | token, senha; token vale 1 h e uma vez |
| GET/PUT/DELETE | /me | Autenticado | dados do perfil conforme o tipo |
| GET | /demandas?data=&local= | Público | `data` = dia (AAAA-MM-DD), `local` = trecho do texto |
| GET | /demandas/:id | Público | inclui instituição, vagas_restantes e, se voluntário logado, `minha_inscricao` |
| POST | /demandas | Instituição | |
| PUT | /demandas/:id | Instituição dona | avisa inscritos por e-mail |
| POST | /demandas/:id/cancelar | Instituição dona | avisa inscritos |
| POST | /demandas/:id/concluir | Instituição dona | |
| GET | /instituicoes/me/demandas | Instituição | todas, com contagem de inscritos |
| POST | /demandas/:id/inscricoes | Voluntário | 409 se esgotada/já inscrito; avisa instituição |
| DELETE | /inscricoes/:id | Voluntário dono ou instituição da demanda | muda para CANCELADA; avisa instituição |
| GET | /demandas/:id/inscricoes | Instituição dona | inclui nome, e-mail e contato do voluntário |
| GET | /voluntarios/me/inscricoes | Voluntário | histórico com situação: em andamento / concluída / cancelada |
| GET | /instituicoes/:id/impacto | Público | `{instituicao:{nome, descricao, area_atuacao}, acoes_realizadas, voluntarios_mobilizados, proximas_demandas}` |

## 5. Telas

| Rota (front) | Tela | Quem | Chamadas |
|---|---|---|---|
| `/` | Demandas abertas + filtros de data e local | todos | GET /demandas |
| `/demandas/:id` | Detalhe, botão Inscrever-me / Cancelar inscrição | todos | GET /demandas/:id, POST inscricoes, DELETE inscricoes/:id |
| `/entrar` | Login | visitante | POST /auth/login |
| `/cadastro` | Cadastro (escolha: voluntário ou instituição) + aceite LGPD | visitante | POST /auth/cadastro/* |
| `/esqueci-senha` | Pedir link | visitante | POST /auth/esqueci-senha |
| `/redefinir-senha?token=` | Nova senha | visitante | POST /auth/redefinir-senha |
| `/conta` | Meus dados, editar, excluir conta | logado | GET/PUT/DELETE /me |
| `/minhas-inscricoes` | Histórico de participação | voluntário | GET /voluntarios/me/inscricoes |
| `/painel` | Minhas demandas (próximas e anteriores), concluir/cancelar | instituição | GET /instituicoes/me/demandas |
| `/demandas/nova`, `/demandas/:id/editar` | Formulário de demanda | instituição | POST/PUT /demandas |
| `/demandas/:id/inscritos` | Lista de inscritos, remover | instituição dona | GET /demandas/:id/inscricoes, DELETE /inscricoes/:id |
| `/instituicoes/:id` | Perfil público + painel de impacto | todos | GET /instituicoes/:id/impacto |

Navegação: topo branco com logo à esquerda. Visitante vê "Demandas", "Entrar" e "Criar conta".
Logado vê "Demandas", "Minhas inscrições" (voluntário) ou "Painel" (instituição) e um botão
com as iniciais que abre o menu da conta: nome, e-mail, "Minha conta", "Página pública"
(instituição) e "Sair". No celular, os links vão para dentro desse menu.

## 6. Direção visual

Ponto de partida: os ipês de Ouro Preto. O ipê-roxo dá a cor principal e o ipê-amarelo, o
destaque. O site é claro, direto e legível para qualquer pessoa.

- **Cores**
  - Fundo `#F7F6F9` (branco levemente lilás) e superfícies `#FFFFFF`
  - Tinta `#221B2A` — texto
  - Ipê-roxo `#6E2A6B` — ação principal, links, vagas ocupadas, bloco de data
  - Ipê-amarelo `#F5B81B` — avatar da conta e números de impacto
  - Verde `#2C7A55` — confirmação (inscrito, concluída)
  - Pedra `#5F5866` — texto secundário; bordas `#E3DEE6`
  - Erro `#B3261E`
- **Tipo**: uma família só, *Figtree* (400 a 800). Escala 1.25 com corpo de 17 px,
  entrelinha 1.55; textos pequenos com 15 px.
- **Ícone**: flor de ipê de cinco pétalas amarelas sobre quadrado roxo; lembra também
  pessoas em roda, como num mutirão. É o favicon e a marca do topo.
- **Formulários**: campos obrigatórios marcados com `*` e a nota "Campos com * são
  obrigatórios"; campos e botões com a mesma altura (46 px). Dia em DD/MM/AAAA e hora em
  24h (HH:MM), em campos de texto com máscara: o seletor nativo segue o idioma do navegador
  e mostraria MM/DD/AAAA e AM/PM.
- **Layout**: alinhado à esquerda, coluna de até 72ch. Demandas são uma **agenda**, não uma
  grade de cards: cada linha tem um bloco de data à esquerda (dia grande + mês, fundo roxo
  claro) e o conteúdo à direita, separadas por uma linha fina.

```
┌──────────────────────────────────────────────┐
│ ✿ Ajuda Aí      Demandas Entrar [Criar conta]│
├──────────────────────────────────────────────┤
│ Quem precisa de uma mão por aqui             │
│ [DD/MM/AAAA] [Local........] [Buscar]        │
├──────┬───────────────────────────────────────┤
│  14  │ Mutirão de pintura da creche          │
│  nov │ Casa Lar Esperança · Bauxita, OP      │
│      │ ●●●○○○○  4 de 7 vagas livres          │
├──────┼───────────────────────────────────────┤
```

- **O elemento memorável**: o medidor de vagas como **fileira de bolinhas** — uma por vaga,
  roxa quando ocupada, só o contorno quando livre (até 12; acima disso, barra). Todo o resto
  é contido.
- **Princípios**: sem rótulos em caixa alta, sem gradientes, sem sombras decorativas; botões
  dizem a ação ("Inscrever-me", "Publicar demanda"); erros dizem o que fazer; listas vazias
  convidam a agir. Foco visível, responsivo até 360 px, `prefers-reduced-motion` respeitado.

## 7. Fora do escopo do protótipo

Upload de imagem, mapa, chat, moderação/admin, app nativo.
