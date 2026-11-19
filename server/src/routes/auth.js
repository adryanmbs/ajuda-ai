import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { gerarToken } from '../auth.js';
import { enviarEmail, urlDoSite } from '../email.js';
import { HttpError, conflito, requisicaoInvalida } from '../errors.js';
import { email, senha } from '../validate.js';
import { camposInstituicao, camposVoluntario, carregarPerfil, emailEmUso } from './me.js';

const router = Router();

const aceiteLgpd = z.literal(true, { error: 'Para criar a conta, aceite a política de privacidade.' });
const hashDoToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function respostaDeLogin(id) {
  const usuario = await carregarPerfil(id);
  return { token: gerarToken(usuario), usuario };
}

async function criarUsuario(q, dados, tipo) {
  if (await emailEmUso(q, dados.email)) throw conflito('Este e-mail já está cadastrado. Tente entrar.');
  const senhaHash = await bcrypt.hash(dados.senha, 10);
  const { rows } = await q(
    'INSERT INTO usuario (email, senha_hash, tipo, consentimento_lgpd_em) VALUES ($1, $2, $3, now()) RETURNING id',
    [dados.email, senhaHash, tipo],
  );
  return rows[0].id;
}

router.post('/auth/cadastro/voluntario', async (req, res) => {
  const dados = z.object({ email, senha, aceite_lgpd: aceiteLgpd, ...camposVoluntario }).parse(req.body);
  const id = await transaction(async (q) => {
    const id = await criarUsuario(q, dados, 'VOLUNTARIO');
    await q('INSERT INTO voluntario (usuario_id, nome, contato, areas_interesse) VALUES ($1, $2, $3, $4)', [
      id, dados.nome, dados.contato, dados.areas_interesse,
    ]);
    return id;
  });
  res.status(201).json(await respostaDeLogin(id));
});

router.post('/auth/cadastro/instituicao', async (req, res) => {
  const dados = z.object({ email, senha, aceite_lgpd: aceiteLgpd, ...camposInstituicao }).parse(req.body);
  const id = await transaction(async (q) => {
    const id = await criarUsuario(q, dados, 'INSTITUICAO');
    await q(
      'INSERT INTO instituicao (usuario_id, nome, descricao, area_atuacao, contato) VALUES ($1, $2, $3, $4, $5)',
      [id, dados.nome, dados.descricao, dados.area_atuacao, dados.contato],
    );
    return id;
  });
  res.status(201).json(await respostaDeLogin(id));
});

router.post('/auth/login', async (req, res) => {
  const dados = z.object({ email, senha: z.string({ error: 'Informe a senha.' }) }).parse(req.body);
  const { rows } = await query('SELECT id, senha_hash FROM usuario WHERE email = $1', [dados.email]);
  const ok = rows[0] && (await bcrypt.compare(dados.senha, rows[0].senha_hash));
  if (!ok) throw new HttpError(401, 'E-mail ou senha incorretos.');
  res.json(await respostaDeLogin(rows[0].id));
});

// Responde igual exista ou não a conta, para não revelar quais e-mails estão cadastrados.
router.post('/auth/esqueci-senha', async (req, res) => {
  const dados = z.object({ email }).parse(req.body);
  const { rows } = await query('SELECT id FROM usuario WHERE email = $1', [dados.email]);
  if (rows[0]) {
    const token = crypto.randomBytes(32).toString('hex');
    await query(
      "INSERT INTO token_redefinicao_senha (usuario_id, token_hash, expira_em) VALUES ($1, $2, now() + interval '1 hour')",
      [rows[0].id, hashDoToken(token)],
    );
    enviarEmail(
      dados.email,
      'Redefinir sua senha no Ajuda Aí',
      `Recebemos um pedido para redefinir sua senha.\n\n` +
        `Abra este link para criar uma nova (vale por 1 hora e uma única vez):\n` +
        `${urlDoSite()}/redefinir-senha?token=${token}\n\n` +
        `Se não foi você, ignore este e-mail. Sua senha atual continua valendo.`,
    );
  }
  res.json({ mensagem: 'Se houver uma conta com este e-mail, enviamos um link para redefinir a senha.' });
});

router.post('/auth/redefinir-senha', async (req, res) => {
  const dados = z.object({ token: z.string({ error: 'Link inválido.' }).min(1, 'Link inválido.'), senha }).parse(req.body);
  await transaction(async (q) => {
    const { rows } = await q(
      `SELECT id, usuario_id FROM token_redefinicao_senha
        WHERE token_hash = $1 AND usado_em IS NULL AND expira_em > now()
        FOR UPDATE`,
      [hashDoToken(dados.token)],
    );
    if (!rows[0]) throw requisicaoInvalida('Este link é inválido ou expirou. Peça um novo.');
    await q('UPDATE usuario SET senha_hash = $1 WHERE id = $2', [await bcrypt.hash(dados.senha, 10), rows[0].usuario_id]);
    await q('UPDATE token_redefinicao_senha SET usado_em = now() WHERE id = $1', [rows[0].id]);
  });
  res.json({ mensagem: 'Senha alterada. Você já pode entrar com a nova senha.' });
});

export default router;
