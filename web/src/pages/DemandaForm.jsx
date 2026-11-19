import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useTitulo } from '../hooks.js';
import { deInputLocal, paraInputLocal } from '../formato.js';
import { Aviso, Campo, Carregando, aoMudar } from '../components/ui.jsx';

const vazio = { titulo: '', descricao: '', data: '', local: '', num_vagas: 5 };

export default function DemandaForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  useTitulo(editando ? 'Editar demanda' : 'Publicar demanda');
  const navegar = useNavigate();
  const [dados, setDados] = useState(editando ? null : vazio);
  const [inscritos, setInscritos] = useState(0);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!editando) return;
    api(`/demandas/${id}`)
      .then((d) => {
        setDados({ titulo: d.titulo, descricao: d.descricao, data: paraInputLocal(d.data), local: d.local, num_vagas: d.num_vagas });
        setInscritos(d.inscritos);
      })
      .catch((e) => setErro(e.message));
  }, [editando, id]);

  if (!dados) return erro ? <Aviso>{erro}</Aviso> : <Carregando />;

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    const corpo = { ...dados, data: deInputLocal(dados.data), num_vagas: Number(dados.num_vagas) };
    try {
      const d = await api(editando ? `/demandas/${id}` : '/demandas', { metodo: editando ? 'PUT' : 'POST', corpo });
      navegar(`/demandas/${d.id}`);
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  const mudar = aoMudar(setDados);

  return (
    <section className="pagina pagina--estreita">
      <Link className="voltar" to="/painel">Painel</Link>
      <h1>{editando ? 'Editar demanda' : 'Publicar demanda'}</h1>
      {editando && inscritos > 0 && (
        <p className="nota">
          {inscritos === 1 ? 'A pessoa inscrita recebe' : `As ${inscritos} pessoas inscritas recebem`} um e-mail avisando da alteração.
        </p>
      )}
      <form onSubmit={enviar} className="formulario">
        <Campo rotulo="Título" name="titulo" required maxLength={120} placeholder="Ex.: Mutirão de limpeza da praça" value={dados.titulo} onChange={mudar} />
        <Campo
          rotulo="O que os voluntários vão fazer"
          name="descricao"
          multilinha
          rows={6}
          required
          maxLength={4000}
          dica="Conte a tarefa, o que levar e quanto tempo deve durar."
          value={dados.descricao}
          onChange={mudar}
        />
        <div className="campos-lado">
          <Campo rotulo="Dia e hora" name="data" type="datetime-local" required min={paraInputLocal(new Date())} value={dados.data} onChange={mudar} />
          <Campo
            rotulo="Vagas"
            name="num_vagas"
            type="number"
            required
            min={Math.max(1, inscritos)}
            max={500}
            value={dados.num_vagas}
            onChange={mudar}
          />
        </div>
        <Campo rotulo="Local" name="local" required maxLength={200} placeholder="Rua, número, bairro e cidade" value={dados.local} onChange={mudar} />
        <Aviso>{erro}</Aviso>
        <button className="botao botao--grande" disabled={enviando}>
          {enviando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Publicar demanda'}
        </button>
      </form>
    </section>
  );
}
