process.env.NODE_ENV = 'test';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { iniciarBanco, fecharBanco, query } from '../src/db.js';
import { caixaDeSaida } from '../src/email.js';

let app;
const amanha = () => new Date(Date.now() + 24 * 3600 * 1000).toISOString();

before(async () => {
  await iniciarBanco({ memoria: true });
  app = criarApp();
});
after(() => fecharBanco());

let contador = 0;
async function cadastrar(tipo, extra = {}) {
  contador += 1;
  const base = { email: `pessoa${contador}@teste.com`, senha: 'senha123', aceite_lgpd: true, contato: '(31) 99999-0000' };
  const corpo =
    tipo === 'voluntario'
      ? { ...base, nome: `Voluntário ${contador}`, ...extra }
      : { ...base, nome: `Instituição ${contador}`, descricao: 'Ajuda a comunidade', area_atuacao: 'Educação', ...extra };
  const res = await request(app).post(`/api/auth/cadastro/${tipo}`).send(corpo);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { ...res.body, auth: `Bearer ${res.body.token}`, email: corpo.email };
}

async function criarDemanda(inst, extra = {}) {
  const res = await request(app)
    .post('/api/demandas')
    .set('Authorization', inst.auth)
    .send({ titulo: 'Mutirão', descricao: 'Pintar a creche', data: amanha(), local: 'Bauxita, Ouro Preto', num_vagas: 2, ...extra });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body;
}

test('cadastro exige aceite da LGPD e e-mail único', async () => {
  const sem = await request(app).post('/api/auth/cadastro/voluntario')
    .send({ nome: 'Ana', email: 'ana@teste.com', senha: 'senha123', contato: '31' });
  assert.equal(sem.status, 400);
  assert.match(sem.body.erro, /política de privacidade/);

  const v = await cadastrar('voluntario');
  const dup = await request(app).post('/api/auth/cadastro/voluntario')
    .send({ nome: 'Outra', email: v.email, senha: 'senha123', contato: '31', aceite_lgpd: true });
  assert.equal(dup.status, 409);
});

test('login com senha errada falha e certa devolve token', async () => {
  const v = await cadastrar('voluntario');
  const errada = await request(app).post('/api/auth/login').send({ email: v.email, senha: 'outrasenha' });
  assert.equal(errada.status, 401);
  const certa = await request(app).post('/api/auth/login').send({ email: v.email.toUpperCase(), senha: 'senha123' });
  assert.equal(certa.status, 200);
  assert.equal(certa.body.usuario.tipo, 'VOLUNTARIO');
});

test('só instituição publica demanda e ela aparece na listagem com filtros', async () => {
  const v = await cadastrar('voluntario');
  const inst = await cadastrar('instituicao');
  const negado = await request(app).post('/api/demandas').set('Authorization', v.auth).send({});
  assert.equal(negado.status, 403);

  const d = await criarDemanda(inst, { local: 'Cabeças, Ouro Preto' });
  const lista = await request(app).get('/api/demandas').query({ local: 'cabeças' });
  assert.ok(lista.body.some((x) => x.id === d.id));
  const outraCidade = await request(app).get('/api/demandas').query({ local: 'Mariana' });
  assert.ok(!outraCidade.body.some((x) => x.id === d.id));

  const dia = new Date(d.data).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const porDia = await request(app).get('/api/demandas').query({ data: dia });
  assert.ok(porDia.body.some((x) => x.id === d.id));
});

test('inscrição respeita vagas, impede duplicidade e notifica a instituição', async () => {
  const inst = await cadastrar('instituicao');
  const d = await criarDemanda(inst, { num_vagas: 1 });
  const v1 = await cadastrar('voluntario');
  const v2 = await cadastrar('voluntario');

  caixaDeSaida.length = 0;
  const ok = await request(app).post(`/api/demandas/${d.id}/inscricoes`).set('Authorization', v1.auth);
  assert.equal(ok.status, 201);
  assert.equal(caixaDeSaida[0].para, inst.email);

  const dup = await request(app).post(`/api/demandas/${d.id}/inscricoes`).set('Authorization', v1.auth);
  assert.equal(dup.status, 409);
  const cheia = await request(app).post(`/api/demandas/${d.id}/inscricoes`).set('Authorization', v2.auth);
  assert.equal(cheia.status, 409);
  assert.match(cheia.body.erro, /vagas/);

  const detalhe = await request(app).get(`/api/demandas/${d.id}`).set('Authorization', v1.auth);
  assert.equal(detalhe.body.vagas_restantes, 0);
  assert.equal(detalhe.body.minha_inscricao.id, ok.body.id);

  // cancelar libera a vaga
  const cancel = await request(app).delete(`/api/inscricoes/${ok.body.id}`).set('Authorization', v1.auth);
  assert.equal(cancel.status, 204);
  const agora = await request(app).post(`/api/demandas/${d.id}/inscricoes`).set('Authorization', v2.auth);
  assert.equal(agora.status, 201);
});

test('inscrições simultâneas não passam do limite de vagas', async () => {
  const inst = await cadastrar('instituicao');
  const d = await criarDemanda(inst, { num_vagas: 2 });
  const vols = await Promise.all([1, 2, 3, 4, 5].map(() => cadastrar('voluntario')));
  const res = await Promise.all(
    vols.map((v) => request(app).post(`/api/demandas/${d.id}/inscricoes`).set('Authorization', v.auth)),
  );
  assert.equal(res.filter((r) => r.status === 201).length, 2);
});

test('apenas a instituição dona edita, cancela e vê inscritos', async () => {
  const dona = await cadastrar('instituicao');
  const outra = await cadastrar('instituicao');
  const v = await cadastrar('voluntario');
  const d = await criarDemanda(dona);
  await request(app).post(`/api/demandas/${d.id}/inscricoes`).set('Authorization', v.auth);

  const alheia = await request(app).get(`/api/demandas/${d.id}/inscricoes`).set('Authorization', outra.auth);
  assert.equal(alheia.status, 403);
  const inscritos = await request(app).get(`/api/demandas/${d.id}/inscricoes`).set('Authorization', dona.auth);
  assert.equal(inscritos.body.length, 1);
  assert.equal(inscritos.body[0].email, v.email);

  const poucas = await request(app).put(`/api/demandas/${d.id}`).set('Authorization', dona.auth)
    .send({ ...d, num_vagas: 0 });
  assert.equal(poucas.status, 400);

  caixaDeSaida.length = 0;
  const edit = await request(app).put(`/api/demandas/${d.id}`).set('Authorization', dona.auth)
    .send({ ...d, titulo: 'Mutirão de pintura' });
  assert.equal(edit.status, 200);
  assert.equal(caixaDeSaida[0].para, v.email);

  const cancelOutra = await request(app).post(`/api/demandas/${d.id}/cancelar`).set('Authorization', outra.auth);
  assert.equal(cancelOutra.status, 403);
  const cancel = await request(app).post(`/api/demandas/${d.id}/cancelar`).set('Authorization', dona.auth);
  assert.equal(cancel.status, 200);
  const lista = await request(app).get('/api/demandas');
  assert.ok(!lista.body.some((x) => x.id === d.id));
});

test('demanda que já ocorreu não pode ser editada; concluída conta no impacto e no histórico', async () => {
  const inst = await cadastrar('instituicao');
  const v = await cadastrar('voluntario');
  const d = await criarDemanda(inst);
  await request(app).post(`/api/demandas/${d.id}/inscricoes`).set('Authorization', v.auth);
  // simula a passagem do tempo
  await query(`UPDATE demanda SET data = now() - interval '1 day' WHERE id = $1`, [d.id]);

  const edit = await request(app).put(`/api/demandas/${d.id}`).set('Authorization', inst.auth).send({ ...d });
  assert.equal(edit.status, 409);

  const concl = await request(app).post(`/api/demandas/${d.id}/concluir`).set('Authorization', inst.auth);
  assert.equal(concl.status, 200);

  const impacto = await request(app).get(`/api/instituicoes/${inst.usuario.id}/impacto`);
  assert.equal(impacto.body.acoes_realizadas, 1);
  assert.equal(impacto.body.voluntarios_mobilizados, 1);

  const hist = await request(app).get('/api/voluntarios/me/inscricoes').set('Authorization', v.auth);
  assert.equal(hist.body[0].situacao, 'CONCLUIDA');
});

test('redefinição de senha: token vale uma vez', async () => {
  const v = await cadastrar('voluntario');
  caixaDeSaida.length = 0;
  const pedido = await request(app).post('/api/auth/esqueci-senha').send({ email: v.email });
  assert.equal(pedido.status, 200);
  const token = caixaDeSaida[0].texto.match(/token=([a-f0-9]+)/)[1];

  const inexistente = await request(app).post('/api/auth/esqueci-senha').send({ email: 'ninguem@teste.com' });
  assert.equal(inexistente.status, 200);

  const ok = await request(app).post('/api/auth/redefinir-senha').send({ token, senha: 'novasenha1' });
  assert.equal(ok.status, 200);
  const deNovo = await request(app).post('/api/auth/redefinir-senha').send({ token, senha: 'outra12345' });
  assert.equal(deNovo.status, 400);
  const login = await request(app).post('/api/auth/login').send({ email: v.email, senha: 'novasenha1' });
  assert.equal(login.status, 200);
});

test('usuário atualiza dados e exclui a conta', async () => {
  const v = await cadastrar('voluntario');
  const sem = await request(app).get('/api/me');
  assert.equal(sem.status, 401);

  const put = await request(app).put('/api/me').set('Authorization', v.auth)
    .send({ email: v.email, nome: 'Nome Novo', contato: '31 98888-7777', areas_interesse: 'Educação' });
  assert.equal(put.status, 200);
  assert.equal(put.body.nome, 'Nome Novo');

  const del = await request(app).delete('/api/me').set('Authorization', v.auth);
  assert.equal(del.status, 204);
  const login = await request(app).post('/api/auth/login').send({ email: v.email, senha: 'senha123' });
  assert.equal(login.status, 401);
});

test('id inválido e rota inexistente respondem 404', async () => {
  assert.equal((await request(app).get('/api/demandas/nao-e-uuid')).status, 404);
  assert.equal((await request(app).get('/api/nada')).status, 404);
});
