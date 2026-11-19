import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApi, useTitulo } from '../hooks.js';
import { dataCurta, dataLonga, hora, jaPassou } from '../formato.js';
import Vagas from '../components/Vagas.jsx';
import { Aviso, Carregando } from '../components/ui.jsx';

export default function Inscritos() {
  const { id } = useParams();
  const demanda = useApi(`/demandas/${id}`);
  const lista = useApi(`/demandas/${id}/inscricoes`);
  const [aviso, setAviso] = useState(null);
  useTitulo(demanda.dados ? `Inscritos: ${demanda.dados.titulo}` : 'Inscritos');

  if (demanda.carregando || lista.carregando) {
    if (!demanda.dados || !lista.dados) return <Carregando />;
  }
  const erro = demanda.erro || lista.erro;
  if (erro) return <Aviso>{erro.message}</Aviso>;

  const d = demanda.dados;
  const ativos = lista.dados.filter((i) => i.status === 'ATIVA');
  const cancelados = lista.dados.filter((i) => i.status === 'CANCELADA');
  const podeRemover = d.status === 'ABERTA' && !jaPassou(d.data);

  async function remover(i) {
    if (!window.confirm(`Remover ${i.nome} desta demanda? A pessoa recebe um e-mail avisando.`)) return;
    try {
      await api(`/inscricoes/${i.id}`, { metodo: 'DELETE' });
      setAviso({ tipo: 'ok', texto: `${i.nome} foi removido(a). A vaga está livre de novo.` });
      lista.recarregar();
      demanda.recarregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e.message });
    }
  }

  return (
    <section className="pagina">
      <Link className="voltar" to="/painel">Painel</Link>
      <h1>{d.titulo}</h1>
      <p className="linha__meta">{dataLonga(d.data)}, às {hora(d.data)}<br />{d.local}</p>
      <Vagas total={d.num_vagas} ocupadas={d.inscritos} grande />
      <Aviso tipo={aviso?.tipo}>{aviso?.texto}</Aviso>

      <h2>Inscritos</h2>
      {ativos.length === 0 ? (
        <p className="vazio">Ninguém se inscreveu ainda. Você recebe um e-mail a cada nova inscrição.</p>
      ) : (
        <ul className="pessoas">
          {ativos.map((i) => (
            <li key={i.id} className="pessoa">
              <div>
                <p className="pessoa__nome">{i.nome}</p>
                <p className="pessoa__contato">
                  <a href={`tel:${i.contato.replace(/[^\d+]/g, '')}`}>{i.contato}</a>
                  <br />
                  <a href={`mailto:${i.email}`}>{i.email}</a>
                </p>
                {i.areas_interesse && <p className="nota">Interesses: {i.areas_interesse}</p>}
                <p className="nota">Inscrito em {dataCurta(i.criada_em)}</p>
              </div>
              {podeRemover && (
                <button className="botao botao--pequeno botao--texto botao--perigo-texto" onClick={() => remover(i)}>
                  Remover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {cancelados.length > 0 && (
        <>
          <h2>Cancelaram</h2>
          <ul className="pessoas pessoas--canceladas">
            {cancelados.map((i) => (
              <li key={i.id} className="pessoa">
                <p className="pessoa__nome">{i.nome}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
