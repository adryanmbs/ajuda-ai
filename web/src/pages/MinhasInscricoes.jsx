import { Link } from 'react-router-dom';
import { useApi, useTitulo } from '../hooks.js';
import { jaPassou, quando } from '../formato.js';
import { Data } from '../components/DemandaLinha.jsx';
import { Aviso, Carregando } from '../components/ui.jsx';

const SITUACAO = {
  EM_ANDAMENTO: { texto: 'Inscrito', classe: 'selo--ok' },
  CONCLUIDA: { texto: 'Concluída', classe: 'selo--concluida' },
  CANCELADA: { texto: 'Cancelada', classe: 'selo--cancelada' },
};

function Item({ i }) {
  const s = i.situacao === 'EM_ANDAMENTO' && jaPassou(i.data)
    ? { texto: 'Aguardando a instituição', classe: '' }
    : SITUACAO[i.situacao];
  return (
    <li className="linha">
      <Data data={i.data} />
      <div className="linha__corpo">
        <h3 className="linha__titulo"><Link to={`/demandas/${i.demanda_id}`}>{i.titulo}</Link></h3>
        <p className="linha__inst"><Link to={`/instituicoes/${i.instituicao_id}`}>{i.instituicao_nome}</Link></p>
        <p className="linha__meta">{quando(i.data)}<br />{i.local}</p>
        <span className={`selo ${s.classe}`}>{s.texto}</span>
      </div>
    </li>
  );
}

export default function MinhasInscricoes() {
  useTitulo('Minhas inscrições');
  const { dados, erro, carregando } = useApi('/voluntarios/me/inscricoes');

  if (carregando) return <Carregando />;
  if (erro) return <Aviso>{erro.message}</Aviso>;

  const proximas = dados.filter((i) => i.situacao === 'EM_ANDAMENTO' && !jaPassou(i.data)).reverse();
  const historico = dados.filter((i) => !proximas.includes(i));
  const concluidas = dados.filter((i) => i.situacao === 'CONCLUIDA').length;

  return (
    <section className="pagina">
      <h1>Minhas inscrições</h1>
      {concluidas > 0 && (
        <p className="frase-impacto">
          Você já participou de <strong>{concluidas === 1 ? '1 ação' : `${concluidas} ações`}</strong>. Obrigado.
        </p>
      )}

      <h2>Próximas</h2>
      {proximas.length === 0 ? (
        <div className="vazio">
          <p>Você não tem nenhuma ação marcada.</p>
          <Link className="botao" to="/">Ver demandas abertas</Link>
        </div>
      ) : (
        <ol className="agenda">{proximas.map((i) => <Item key={i.id} i={i} />)}</ol>
      )}

      {historico.length > 0 && (
        <>
          <h2>Histórico</h2>
          <ol className="agenda agenda--passada">{historico.map((i) => <Item key={i.id} i={i} />)}</ol>
        </>
      )}
    </section>
  );
}
