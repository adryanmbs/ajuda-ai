import { Router } from 'express';
import { query } from '../db.js';
import { naoEncontrado } from '../errors.js';
import { listarDemandasAbertas } from './demandas.js';

const router = Router();

// Painel público de impacto: sem tabela própria, calculado a partir das demandas concluídas.
router.get('/instituicoes/:id/impacto', async (req, res) => {
  const { rows } = await query(
    `SELECT inst.usuario_id AS id, inst.nome, inst.descricao, inst.area_atuacao, inst.contato,
            (SELECT count(*)::int FROM demanda d
              WHERE d.instituicao_id = inst.usuario_id AND d.status = 'CONCLUIDA') AS acoes_realizadas,
            (SELECT count(DISTINCT i.voluntario_id)::int FROM inscricao i JOIN demanda d ON d.id = i.demanda_id
              WHERE d.instituicao_id = inst.usuario_id AND d.status = 'CONCLUIDA' AND i.status = 'ATIVA') AS voluntarios_mobilizados
       FROM instituicao inst WHERE inst.usuario_id = $1`,
    [req.params.id],
  );
  if (!rows[0]) throw naoEncontrado('Instituição não encontrada.');
  const { acoes_realizadas, voluntarios_mobilizados, ...instituicao } = rows[0];
  res.json({
    instituicao,
    acoes_realizadas,
    voluntarios_mobilizados,
    proximas_demandas: await listarDemandasAbertas({ instituicaoId: instituicao.id }),
  });
});

export default router;
