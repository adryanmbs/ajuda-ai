import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useApi, useTitulo } from '../hooks.js';
import { dataLonga, hora, jaPassou } from '../formato.js';
import { Data } from '../components/DemandaLinha.jsx';
import Vagas from '../components/Vagas.jsx';
import { Aviso, Carregando } from '../components/ui.jsx';

export default function DemandaDetalhe() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const { dados: d, erro, carregando, recarregar } = useApi(`/demandas/${id}`);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  useTitulo(d?.titulo);

  if (carregando && !d) return <Carregando />;
  if (erro) {
    return (
      <section className="pagina">
        <h1>Demanda não encontrada</h1>
        <p>Ela pode ter sido removida. <Link to="/">Ver demandas abertas</Link></p>
      </section>
    );
  }

  async function executar(fn, sucesso) {
    setEnviando(true);
    setAviso(null);
    try {
      await fn();
      await recarregar();
      setAviso({ tipo: 'ok', texto: sucesso });
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e.message });
    } finally {
      setEnviando(false);
    }
  }

  const inscrever = () =>
    executar(() => api(`/demandas/${id}/inscricoes`, { metodo: 'POST' }), 'Inscrição feita. A instituição já foi avisada por e-mail.');

  const cancelarInscricao = () => {
    if (!window.confirm('Cancelar sua inscrição? A vaga fica livre para outra pessoa.')) return;
    executar(() => api(`/inscricoes/${d.minha_inscricao.id}`, { metodo: 'DELETE' }), 'Inscrição cancelada.');
  };

  const passou = jaPassou(d.data);
  const ehDona = usuario?.tipo === 'INSTITUICAO' && usuario.id === d.instituicao_id;

  function acao() {
    if (d.status === 'CANCELADA') return <p className="situacao situacao--cancelada">Esta demanda foi cancelada pela instituição.</p>;
    if (d.status === 'CONCLUIDA' || passou) return <p className="situacao">Esta ação já aconteceu.</p>;
    if (ehDona) {
      return (
        <div className="acoes">
          <Link className="botao" to={`/demandas/${id}/inscritos`}>Ver inscritos</Link>
          <Link className="botao botao--contorno" to={`/demandas/${id}/editar`}>Editar demanda</Link>
        </div>
      );
    }
    if (!usuario) {
      return (
        <div className="acoes">
          <Link className="botao" to={`/entrar?volta=/demandas/${id}`}>Entrar para me inscrever</Link>
          <Link className="botao botao--texto" to="/cadastro">Criar conta de voluntário</Link>
        </div>
      );
    }
    if (usuario.tipo !== 'VOLUNTARIO') return null;
    if (d.minha_inscricao) {
      return (
        <div className="acoes">
          <p className="situacao situacao--ok">Você está inscrito.</p>
          <button className="botao botao--perigo" onClick={cancelarInscricao} disabled={enviando}>
            Cancelar inscrição
          </button>
        </div>
      );
    }
    if (d.vagas_restantes === 0) return <p className="situacao">As vagas acabaram. Veja outras demandas abertas.</p>;
    return (
      <div className="acoes">
        <button className="botao botao--grande" onClick={inscrever} disabled={enviando}>
          {enviando ? 'Inscrevendo…' : 'Inscrever-me'}
        </button>
      </div>
    );
  }

  return (
    <article className="detalhe">
      <Link className="voltar" to="/">Todas as demandas</Link>
      <header className="detalhe__topo">
        <Data data={d.data} />
        <div>
          <h1 className="detalhe__titulo">{d.titulo}</h1>
          <p className="detalhe__inst">
            <Link to={`/instituicoes/${d.instituicao_id}`}>{d.instituicao_nome}</Link>
          </p>
        </div>
      </header>

      <div className="detalhe__grade">
        <div className="detalhe__texto">
          <h2>O que vamos fazer</h2>
          <p className="texto-livre">{d.descricao}</p>
        </div>
        <aside className="ficha" aria-label="Resumo">
          <dl>
            <dt>Quando</dt>
            <dd>{dataLonga(d.data)}, às {hora(d.data)}</dd>
            <dt>Onde</dt>
            <dd>{d.local}</dd>
            <dt>Vagas</dt>
            <dd><Vagas total={d.num_vagas} ocupadas={d.inscritos} grande /></dd>
            <dt>Contato da instituição</dt>
            <dd>{d.instituicao_contato}</dd>
          </dl>
          <Aviso tipo={aviso?.tipo}>{aviso?.texto}</Aviso>
          {acao()}
        </aside>
      </div>
    </article>
  );
}
