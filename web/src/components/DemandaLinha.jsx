import { Link } from 'react-router-dom';
import { diaDoMes, mesCurto, quando } from '../formato.js';
import Vagas from './Vagas.jsx';

export function Data({ data }) {
  return (
    <time className="data" dateTime={new Date(data).toISOString()}>
      <span className="data__dia">{diaDoMes(data)}</span>
      <span className="data__mes">{mesCurto(data)}</span>
    </time>
  );
}

// Uma linha da agenda de demandas. `extra` permite acrescentar ações (painel da instituição).
export default function DemandaLinha({ demanda, mostrarInstituicao = true, extra, para }) {
  return (
    <li className="linha">
      <Data data={demanda.data} />
      <div className="linha__corpo">
        <h3 className="linha__titulo">
          <Link to={para || `/demandas/${demanda.id}`}>{demanda.titulo}</Link>
        </h3>
        {mostrarInstituicao && <p className="linha__inst">{demanda.instituicao_nome}</p>}
        <p className="linha__meta">
          {quando(demanda.data)}
          <br />
          {demanda.local}
        </p>
        {demanda.num_vagas != null && <Vagas total={demanda.num_vagas} ocupadas={demanda.inscritos} />}
        {extra}
      </div>
    </li>
  );
}
