import { Router } from 'express';
import { query, transaction } from '../db.js';
import { autenticar, exigir } from '../auth.js';
import { enviarEmail, formatarData } from '../email.js';
import { conflito, naoEncontrado, proibido } from '../errors.js';

const router = Router();

router.post('/demandas/:id/inscricoes', exigir('VOLUNTARIO'), async (req, res) => {
  const { inscricao, demanda } = await transaction(async (q) => {
    // Trava a demanda para que duas inscrições simultâneas não passem do limite de vagas.
    const { rows } = await q(
      `SELECT d.*, u.email AS instituicao_email FROM demanda d
         JOIN usuario u ON u.id = d.instituicao_id
        WHERE d.id = $1 FOR UPDATE OF d`,
      [req.params.id],
    );
    const demanda = rows[0];
    if (!demanda) throw naoEncontrado('Demanda não encontrada.');
    if (demanda.status !== 'ABERTA') throw conflito('Esta demanda não está aberta para inscrições.');
    if (new Date(demanda.data) <= new Date()) throw conflito('Esta demanda já aconteceu.');

    const { rows: ativas } = await q(
      `SELECT voluntario_id FROM inscricao WHERE demanda_id = $1 AND status = 'ATIVA'`,
      [demanda.id],
    );
    if (ativas.some((a) => a.voluntario_id === req.usuario.id)) {
      throw conflito('Você já está inscrito nesta demanda.');
    }
    if (ativas.length >= demanda.num_vagas) throw conflito('As vagas desta demanda acabaram.');

    const r = await q('INSERT INTO inscricao (voluntario_id, demanda_id) VALUES ($1, $2) RETURNING *', [
      req.usuario.id, demanda.id,
    ]);
    return { inscricao: r.rows[0], demanda };
  });

  const { rows } = await query('SELECT nome, contato FROM voluntario WHERE usuario_id = $1', [req.usuario.id]);
  enviarEmail(
    demanda.instituicao_email,
    `Nova inscrição: ${demanda.titulo}`,
    `${rows[0].nome} se inscreveu em "${demanda.titulo}" (${formatarData(demanda.data)}).\n` +
      `Contato: ${rows[0].contato}\n\nVeja todos os inscritos no seu painel do Ajuda Aí.`,
  );
  res.status(201).json(inscricao);
});

router.delete('/inscricoes/:id', autenticar, async (req, res) => {
  const { rows } = await query(
    `SELECT i.id, i.status, i.voluntario_id, d.instituicao_id, d.titulo, d.data,
            v.nome AS voluntario_nome, uv.email AS voluntario_email, ui.email AS instituicao_email
       FROM inscricao i
       JOIN demanda d ON d.id = i.demanda_id
       JOIN voluntario v ON v.usuario_id = i.voluntario_id
       JOIN usuario uv ON uv.id = i.voluntario_id
       JOIN usuario ui ON ui.id = d.instituicao_id
      WHERE i.id = $1`,
    [req.params.id],
  );
  const insc = rows[0];
  if (!insc) throw naoEncontrado('Inscrição não encontrada.');

  const ehVoluntario = req.usuario.tipo === 'VOLUNTARIO' && insc.voluntario_id === req.usuario.id;
  const ehInstituicao = req.usuario.tipo === 'INSTITUICAO' && insc.instituicao_id === req.usuario.id;
  if (!ehVoluntario && !ehInstituicao) throw proibido();
  if (insc.status === 'CANCELADA') throw conflito('Esta inscrição já foi cancelada.');
  if (new Date(insc.data) <= new Date()) throw conflito('A demanda já aconteceu; a inscrição não pode mais ser cancelada.');

  await query(`UPDATE inscricao SET status = 'CANCELADA' WHERE id = $1`, [insc.id]);

  if (ehVoluntario) {
    enviarEmail(
      insc.instituicao_email,
      `Inscrição cancelada: ${insc.titulo}`,
      `${insc.voluntario_nome} cancelou a inscrição em "${insc.titulo}" (${formatarData(insc.data)}). A vaga foi liberada.`,
    );
  } else {
    enviarEmail(
      insc.voluntario_email,
      `Sua inscrição foi removida: ${insc.titulo}`,
      `A instituição removeu sua inscrição em "${insc.titulo}" (${formatarData(insc.data)}).\n` +
        `Em caso de dúvida, fale com a instituição.`,
    );
  }
  res.status(204).end();
});

router.get('/demandas/:id/inscricoes', exigir('INSTITUICAO'), async (req, res) => {
  const { rows: d } = await query('SELECT instituicao_id FROM demanda WHERE id = $1', [req.params.id]);
  if (!d[0]) throw naoEncontrado('Demanda não encontrada.');
  if (d[0].instituicao_id !== req.usuario.id) throw proibido('Esta demanda é de outra instituição.');

  const { rows } = await query(
    `SELECT i.id, i.status, i.criada_em, v.nome, v.contato, v.areas_interesse, u.email
       FROM inscricao i
       JOIN voluntario v ON v.usuario_id = i.voluntario_id
       JOIN usuario u ON u.id = i.voluntario_id
      WHERE i.demanda_id = $1
      ORDER BY i.status, i.criada_em`,
    [req.params.id],
  );
  res.json(rows);
});

router.get('/voluntarios/me/inscricoes', exigir('VOLUNTARIO'), async (req, res) => {
  const { rows } = await query(
    `SELECT i.id, i.status, i.criada_em,
            d.id AS demanda_id, d.titulo, d.data, d.local, d.status AS demanda_status,
            inst.usuario_id AS instituicao_id, inst.nome AS instituicao_nome,
            CASE
              WHEN i.status = 'CANCELADA' OR d.status = 'CANCELADA' THEN 'CANCELADA'
              WHEN d.status = 'CONCLUIDA' THEN 'CONCLUIDA'
              ELSE 'EM_ANDAMENTO'
            END AS situacao
       FROM inscricao i
       JOIN demanda d ON d.id = i.demanda_id
       JOIN instituicao inst ON inst.usuario_id = d.instituicao_id
      WHERE i.voluntario_id = $1
      ORDER BY d.data DESC`,
    [req.usuario.id],
  );
  res.json(rows);
});

export default router;
