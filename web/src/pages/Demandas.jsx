import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useApi, useTitulo } from '../hooks.js';
import DemandaLinha from '../components/DemandaLinha.jsx';
import { Aviso, Carregando } from '../components/ui.jsx';

export default function Demandas() {
  useTitulo(null);
  const { usuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const data = params.get('data') || '';
  const local = params.get('local') || '';
  const [form, setForm] = useState({ data, local });

  const busca = new URLSearchParams();
  if (data) busca.set('data', data);
  if (local) busca.set('local', local);
  const { dados, erro, carregando } = useApi(`/demandas?${busca}`);

  function buscar(e) {
    e.preventDefault();
    const novos = {};
    if (form.data) novos.data = form.data;
    if (form.local.trim()) novos.local = form.local.trim();
    setParams(novos);
  }

  function limpar() {
    setForm({ data: '', local: '' });
    setParams({});
  }

  const filtrando = data || local;

  return (
    <>
      <section className="abertura">
        <h1 className="abertura__titulo">Quem precisa de uma mão por aqui</h1>
        <p className="abertura__texto">
          Instituições do seu bairro publicam o que precisam. Escolha uma ação, inscreva-se e apareça no dia.
        </p>
        <form className="filtros" onSubmit={buscar} role="search">
          <div className="campo">
            <label htmlFor="f-data">Dia</label>
            <input id="f-data" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </div>
          <div className="campo campo--largo">
            <label htmlFor="f-local">Bairro ou local</label>
            <input
              id="f-local"
              type="search"
              placeholder="Ex.: Bauxita"
              value={form.local}
              onChange={(e) => setForm({ ...form, local: e.target.value })}
            />
          </div>
          <div className="filtros__acoes">
            <button className="botao">Buscar</button>
            {filtrando && (
              <button type="button" className="botao botao--texto" onClick={limpar}>
                Limpar filtros
              </button>
            )}
          </div>
        </form>
      </section>

      <section aria-labelledby="titulo-lista">
        <h2 id="titulo-lista" className="sr-only">Demandas abertas</h2>
        {carregando && <Carregando />}
        <Aviso>{erro?.message}</Aviso>
        {dados && dados.length === 0 && (
          <div className="vazio">
            {filtrando ? (
              <p>Nenhuma demanda aberta com esses filtros. Tente outro dia ou outro local.</p>
            ) : (
              <p>Ainda não há demandas abertas. Volte em breve.</p>
            )}
          </div>
        )}
        {dados?.length > 0 && (
          <>
            <p className="contagem">
              {dados.length === 1 ? '1 demanda aberta' : `${dados.length} demandas abertas`}
              {filtrando ? ' com esses filtros' : ''}
            </p>
            <ol className="agenda">
              {dados.map((d) => (
                <DemandaLinha key={d.id} demanda={d} />
              ))}
            </ol>
          </>
        )}
      </section>

      {!usuario && (
        <aside className="convite">
          <h2>Sua instituição precisa de voluntários?</h2>
          <p>Publique a demanda com data, local e número de vagas. Você recebe um e-mail a cada inscrição.</p>
          <Link className="botao botao--contorno" to="/cadastro?tipo=instituicao">Cadastrar instituição</Link>
        </aside>
      )}
    </>
  );
}
