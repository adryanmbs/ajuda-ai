import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useApi, useTitulo } from '../hooks.js';
import { jaPassou } from '../formato.js';
import DemandaLinha from '../components/DemandaLinha.jsx';
import { Aviso, Carregando } from '../components/ui.jsx';

export default function Painel() {
  useTitulo('Painel');
  const { usuario } = useAuth();
  const { dados, erro, carregando, recarregar } = useApi('/instituicoes/me/demandas');
  const [aviso, setAviso] = useState(null);

  async function acao(d, tipo) {
    const perguntas = {
      cancelar: `Cancelar "${d.titulo}"? Os ${d.inscritos} inscritos recebem um e-mail avisando.`,
      concluir: `Marcar "${d.titulo}" como concluída? Ela passa a contar no seu painel de impacto.`,
    };
    if (!window.confirm(perguntas[tipo])) return;
    try {
      await api(`/demandas/${d.id}/${tipo}`, { metodo: 'POST' });
      setAviso({ tipo: 'ok', texto: tipo === 'cancelar' ? 'Demanda cancelada.' : 'Demanda concluída.' });
      recarregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e.message });
    }
  }

  if (carregando && !dados) return <Carregando />;
  if (erro) return <Aviso>{erro.message}</Aviso>;

  const abertas = dados.filter((d) => d.status === 'ABERTA');
  const proximas = abertas.filter((d) => !jaPassou(d.data)).reverse();
  const aConcluir = abertas.filter((d) => jaPassou(d.data));
  const encerradas = dados.filter((d) => d.status !== 'ABERTA');

  const botoesProxima = (d) => (
    <div className="linha__acoes">
      <Link className="botao botao--pequeno" to={`/demandas/${d.id}/inscritos`}>
        Inscritos ({d.inscritos})
      </Link>
      <Link className="botao botao--pequeno botao--contorno" to={`/demandas/${d.id}/editar`}>Editar</Link>
      <button className="botao botao--pequeno botao--texto botao--perigo-texto" onClick={() => acao(d, 'cancelar')}>
        Cancelar demanda
      </button>
    </div>
  );

  const botoesAConcluir = (d) => (
    <div className="linha__acoes">
      <button className="botao botao--pequeno" onClick={() => acao(d, 'concluir')}>Marcar como concluída</button>
      <Link className="botao botao--pequeno botao--contorno" to={`/demandas/${d.id}/inscritos`}>
        Inscritos ({d.inscritos})
      </Link>
    </div>
  );

  return (
    <section className="pagina">
      <div className="cabecalho-acao">
        <h1>{usuario.nome}</h1>
        <Link className="botao" to="/demandas/nova">Publicar demanda</Link>
      </div>
      <p><Link to={`/instituicoes/${usuario.id}`}>Ver página pública e painel de impacto</Link></p>
      <Aviso tipo={aviso?.tipo}>{aviso?.texto}</Aviso>

      {aConcluir.length > 0 && (
        <>
          <h2>Já aconteceram</h2>
          <p className="nota">Confirme as ações realizadas para que elas entrem no seu painel de impacto.</p>
          <ol className="agenda">
            {aConcluir.map((d) => <DemandaLinha key={d.id} demanda={d} mostrarInstituicao={false} extra={botoesAConcluir(d)} />)}
          </ol>
        </>
      )}

      <h2>Próximas</h2>
      {proximas.length === 0 ? (
        <div className="vazio">
          <p>Nenhuma demanda aberta. Publique a próxima para que voluntários possam se inscrever.</p>
          <Link className="botao" to="/demandas/nova">Publicar demanda</Link>
        </div>
      ) : (
        <ol className="agenda">
          {proximas.map((d) => <DemandaLinha key={d.id} demanda={d} mostrarInstituicao={false} extra={botoesProxima(d)} />)}
        </ol>
      )}

      {encerradas.length > 0 && (
        <>
          <h2>Encerradas</h2>
          <ol className="agenda agenda--passada">
            {encerradas.map((d) => (
              <DemandaLinha
                key={d.id}
                demanda={d}
                mostrarInstituicao={false}
                para={`/demandas/${d.id}/inscritos`}
                extra={
                  <span className={`selo ${d.status === 'CONCLUIDA' ? 'selo--concluida' : 'selo--cancelada'}`}>
                    {d.status === 'CONCLUIDA' ? 'Concluída' : 'Cancelada'}
                  </span>
                }
              />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
