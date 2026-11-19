import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db.js';
import { autenticarOpcional, exigir } from '../auth.js';
import { enviarEmail, formatarData } from '../email.js';
import { conflito, naoEncontrado, proibido, requisicaoInvalida } from '../errors.js';
import { texto } from '../validate.js';

const router = Router();

// Fuso usado para interpretar o filtro por dia (Brasil, sem horário de verão).
const FUSO = '-03:00';

const INSCRITOS = `(SELECT count(*)::int FROM inscricao ins WHERE ins.demanda_id = d.id AND ins.status = 'ATIVA')`;

const CAMPOS = `d.id, d.titulo, d.descricao, d.data, d.local, d.num_vagas, d.status,
                d.instituicao_id, inst.nome AS instituicao_nome, ${INSCRITOS} AS inscritos`;

const comVagas = (d) => ({ ...d, vagas_restantes: Math.max(d.num_vagas - d.inscritos, 0) });

// Demandas abertas e futuras, com filtros opcionais.
export async function listarDemandasAbertas({ data, local, instituicaoId } = {}) {
  const where = [`d.status = 'ABERTA'`, 'd.data >= now()'];
  const params = [];
  if (data) {
    params.push(`${data}T00:00:00${FUSO}`);
    where.push(`d.data >= $${params.length}::timestamptz AND d.data < $${params.length}::timestamptz + interval '1 day'`);
  }
  if (local) {
    params.push(`%${local}%`);
    where.push(`d.local ILIKE $${params.length}`);
  }
  if (instituicaoId) {
    params.push(instituicaoId);
    where.push(`d.instituicao_id = $${params.length}`);
  }
  const { rows } = await query(
    `SELECT ${CAMPOS} FROM demanda d JOIN instituicao inst ON inst.usuario_id = d.instituicao_id
      WHERE ${where.join(' AND ')} ORDER BY d.data LIMIT 100`,
    params,
  );
  return rows.map(comVagas);
}

// Carrega a demanda e confere se pertence à instituição logada.
async function demandaDaInstituicao(q, id, instituicaoId, travar = false) {
  const { rows } = await q(`SELECT * FROM demanda WHERE id = $1 ${travar ? 'FOR UPDATE' : ''}`, [id]);
  const demanda = rows[0];
  if (!demanda) throw naoEncontrado('Demanda não encontrada.');
  if (demanda.instituicao_id !== instituicaoId) throw proibido('Esta demanda é de outra instituição.');
  return demanda;
}

function exigirAlteravel(demanda) {
  if (demanda.status !== 'ABERTA') throw conflito('Esta demanda não está mais aberta.');
  if (new Date(demanda.data) <= new Date()) throw conflito('Esta demanda já aconteceu e não pode ser alterada.');
}

async function emailsDosInscritos(q, demandaId) {
  const { rows } = await q(
    `SELECT u.email FROM inscricao i JOIN usuario u ON u.id = i.voluntario_id
      WHERE i.demanda_id = $1 AND i.status = 'ATIVA'`,
    [demandaId],
  );
  return rows.map((r) => r.email);
}

const dadosDemanda = z.object({
  titulo: texto('o título'),
  descricao: texto('a descrição', 4000),
  data: z.coerce
    .date({ error: 'Informe uma data e hora válidas.' })
    .refine((d) => d > new Date(), 'Escolha uma data no futuro.'),
  local: texto('o local', 200),
  num_vagas: z.coerce
    .number({ error: 'Informe o número de vagas.' })
    .int('O número de vagas deve ser inteiro.')
    .min(1, 'A demanda precisa de pelo menos 1 vaga.')
    .max(500, 'Use no máximo 500 vagas.'),
});

router.get('/demandas', async (req, res) => {
  const filtros = z
    .object({
      data: z.iso.date('Use a data no formato AAAA-MM-DD.').optional().or(z.literal('')),
      local: z.string().trim().max(100).optional(),
    })
    .parse(req.query);
  res.json(await listarDemandasAbertas(filtros));
});

router.get('/demandas/:id', autenticarOpcional, async (req, res) => {
  const { rows } = await query(
    `SELECT ${CAMPOS}, inst.contato AS instituicao_contato, inst.area_atuacao AS instituicao_area
       FROM demanda d JOIN instituicao inst ON inst.usuario_id = d.instituicao_id
      WHERE d.id = $1`,
    [req.params.id],
  );
  if (!rows[0]) throw naoEncontrado('Demanda não encontrada.');
  const demanda = comVagas(rows[0]);

  if (req.usuario?.tipo === 'VOLUNTARIO') {
    const r = await query(
      `SELECT id, criada_em FROM inscricao WHERE demanda_id = $1 AND voluntario_id = $2 AND status = 'ATIVA'`,
      [demanda.id, req.usuario.id],
    );
    demanda.minha_inscricao = r.rows[0] || null;
  }
  res.json(demanda);
});

router.post('/demandas', exigir('INSTITUICAO'), async (req, res) => {
  const d = dadosDemanda.parse(req.body);
  const { rows } = await query(
    `INSERT INTO demanda (instituicao_id, titulo, descricao, data, local, num_vagas)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.usuario.id, d.titulo, d.descricao, d.data, d.local, d.num_vagas],
  );
  res.status(201).json(rows[0]);
});

router.put('/demandas/:id', exigir('INSTITUICAO'), async (req, res) => {
  const d = dadosDemanda.parse(req.body);
  const { demanda, emails } = await transaction(async (q) => {
    exigirAlteravel(await demandaDaInstituicao(q, req.params.id, req.usuario.id, true));
    const emails = await emailsDosInscritos(q, req.params.id);
    if (d.num_vagas < emails.length) {
      throw conflito(`Já há ${emails.length} inscritos. O número de vagas não pode ser menor que isso.`);
    }
    const { rows } = await q(
      `UPDATE demanda SET titulo = $1, descricao = $2, data = $3, local = $4, num_vagas = $5
        WHERE id = $6 RETURNING *`,
      [d.titulo, d.descricao, d.data, d.local, d.num_vagas, req.params.id],
    );
    return { demanda: rows[0], emails };
  });

  for (const para of emails) {
    enviarEmail(
      para,
      `Demanda atualizada: ${demanda.titulo}`,
      `A instituição alterou uma demanda em que você está inscrito.\n\n` +
        `${demanda.titulo}\nQuando: ${formatarData(demanda.data)}\nOnde: ${demanda.local}\n\n` +
        `Confira os detalhes no Ajuda Aí. Se não puder mais ir, cancele sua inscrição para liberar a vaga.`,
    );
  }
  res.json(demanda);
});

router.post('/demandas/:id/cancelar', exigir('INSTITUICAO'), async (req, res) => {
  const { demanda, emails } = await transaction(async (q) => {
    const demanda = await demandaDaInstituicao(q, req.params.id, req.usuario.id, true);
    exigirAlteravel(demanda);
    await q(`UPDATE demanda SET status = 'CANCELADA' WHERE id = $1`, [demanda.id]);
    return { demanda, emails: await emailsDosInscritos(q, demanda.id) };
  });

  for (const para of emails) {
    enviarEmail(
      para,
      `Demanda cancelada: ${demanda.titulo}`,
      `A instituição cancelou a demanda "${demanda.titulo}", marcada para ${formatarData(demanda.data)}.\n\n` +
        `Obrigado pela disposição. Veja outras demandas abertas no Ajuda Aí.`,
    );
  }
  res.json({ ...demanda, status: 'CANCELADA' });
});

router.post('/demandas/:id/concluir', exigir('INSTITUICAO'), async (req, res) => {
  const demanda = await demandaDaInstituicao(query,req.params.id, req.usuario.id);
  if (demanda.status !== 'ABERTA') throw conflito('Só demandas abertas podem ser concluídas.');
  if (new Date(demanda.data) > new Date()) {
    throw requisicaoInvalida('A demanda só pode ser concluída depois da data marcada.');
  }
  await query(`UPDATE demanda SET status = 'CONCLUIDA' WHERE id = $1`, [demanda.id]);
  res.json({ ...demanda, status: 'CONCLUIDA' });
});

router.get('/instituicoes/me/demandas', exigir('INSTITUICAO'), async (req, res) => {
  const { rows } = await query(
    `SELECT ${CAMPOS} FROM demanda d JOIN instituicao inst ON inst.usuario_id = d.instituicao_id
      WHERE d.instituicao_id = $1 ORDER BY d.data DESC`,
    [req.usuario.id],
  );
  res.json(rows.map(comVagas));
});

export default router;
