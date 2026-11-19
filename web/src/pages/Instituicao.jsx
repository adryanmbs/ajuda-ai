import { Link, useParams } from 'react-router-dom';
import { useApi, useTitulo } from '../hooks.js';
import DemandaLinha from '../components/DemandaLinha.jsx';
import { Carregando } from '../components/ui.jsx';

export default function Instituicao() {
  const { id } = useParams();
  const { dados, erro, carregando } = useApi(`/instituicoes/${id}/impacto`);
  useTitulo(dados?.instituicao.nome);

  if (carregando) return <Carregando />;
  if (erro) {
    return (
      <section className="pagina">
        <h1>Instituição não encontrada</h1>
        <p><Link to="/">Ver demandas abertas</Link></p>
      </section>
    );
  }

  const { instituicao: inst, acoes_realizadas: acoes, voluntarios_mobilizados: vols, proximas_demandas: proximas } = dados;

  return (
    <section className="pagina">
      <p className="area">{inst.area_atuacao}</p>
      <h1 className="inst__nome">{inst.nome}</h1>
      <p className="texto-livre inst__descricao">{inst.descricao}</p>
      <p className="nota">Contato: {inst.contato}</p>

      <div className="impacto" aria-label="Painel de impacto">
        {acoes === 0 ? (
          <p className="impacto__frase">As primeiras ações desta instituição aparecem aqui assim que forem concluídas.</p>
        ) : (
          <p className="impacto__frase">
            Já realizou <span className="impacto__num">{acoes}</span> {acoes === 1 ? 'ação' : 'ações'} com{' '}
            <span className="impacto__num">{vols}</span> {vols === 1 ? 'voluntário' : 'voluntários'}.
          </p>
        )}
      </div>

      <h2>Próximas demandas</h2>
      {proximas.length === 0 ? (
        <p className="vazio">Nenhuma demanda aberta no momento.</p>
      ) : (
        <ol className="agenda">
          {proximas.map((d) => <DemandaLinha key={d.id} demanda={d} mostrarInstituicao={false} />)}
        </ol>
      )}
    </section>
  );
}
