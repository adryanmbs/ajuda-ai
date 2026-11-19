import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { autenticar } from '../auth.js';
import { conflito, naoEncontrado } from '../errors.js';
import { email, texto, textoOpcional } from '../validate.js';

const router = Router();

export async function carregarPerfil(id, q = query) {
  const { rows } = await q(
    `SELECT u.id, u.email, u.tipo, u.criado_em,
            v.nome AS v_nome, v.contato AS v_contato, v.areas_interesse,
            i.nome AS i_nome, i.contato AS i_contato, i.descricao, i.area_atuacao
       FROM usuario u
       LEFT JOIN voluntario v ON v.usuario_id = u.id
       LEFT JOIN instituicao i ON i.usuario_id = u.id
      WHERE u.id = $1`,
    [id],
  );
  const u = rows[0];
  if (!u) return null;
  const base = { id: u.id, email: u.email, tipo: u.tipo, criado_em: u.criado_em };
  return u.tipo === 'VOLUNTARIO'
    ? { ...base, nome: u.v_nome, contato: u.v_contato, areas_interesse: u.areas_interesse }
    : { ...base, nome: u.i_nome, contato: u.i_contato, descricao: u.descricao, area_atuacao: u.area_atuacao };
}

export const camposVoluntario = {
  nome: texto('o nome'),
  contato: texto('um telefone ou WhatsApp'),
  areas_interesse: textoOpcional(500),
};

export const camposInstituicao = {
  nome: texto('o nome da instituição'),
  descricao: texto('uma descrição', 2000),
  area_atuacao: texto('a área de atuação'),
  contato: texto('um telefone ou WhatsApp'),
};

export async function emailEmUso(q, valor, excetoId = null) {
  const { rows } = await q('SELECT 1 FROM usuario WHERE email = $1 AND id IS DISTINCT FROM $2', [valor, excetoId]);
  return rows.length > 0;
}

router.use('/me', autenticar);

router.get('/me', async (req, res) => {
  const perfil = await carregarPerfil(req.usuario.id);
  if (!perfil) throw naoEncontrado('Conta não encontrada.');
  res.json(perfil);
});

router.put('/me', async (req, res) => {
  const ehVoluntario = req.usuario.tipo === 'VOLUNTARIO';
  const dados = z
    .object({ email, ...(ehVoluntario ? camposVoluntario : camposInstituicao) })
    .parse(req.body);

  await transaction(async (q) => {
    if (await emailEmUso(q, dados.email, req.usuario.id)) {
      throw conflito('Este e-mail já está em uso por outra conta.');
    }
    await q('UPDATE usuario SET email = $1 WHERE id = $2', [dados.email, req.usuario.id]);
    if (ehVoluntario) {
      await q('UPDATE voluntario SET nome = $1, contato = $2, areas_interesse = $3 WHERE usuario_id = $4', [
        dados.nome, dados.contato, dados.areas_interesse, req.usuario.id,
      ]);
    } else {
      await q(
        'UPDATE instituicao SET nome = $1, descricao = $2, area_atuacao = $3, contato = $4 WHERE usuario_id = $5',
        [dados.nome, dados.descricao, dados.area_atuacao, dados.contato, req.usuario.id],
      );
    }
  });
  res.json(await carregarPerfil(req.usuario.id));
});

// LGPD: apaga a conta e, em cascata, perfil, demandas e inscrições.
router.delete('/me', async (req, res) => {
  await query('DELETE FROM usuario WHERE id = $1', [req.usuario.id]);
  res.status(204).end();
});

export default router;
