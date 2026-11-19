import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useTitulo } from '../hooks.js';
import { Aviso, Campo, aoMudar } from '../components/ui.jsx';
import { CamposPerfil } from './Cadastro.jsx';

export default function Conta() {
  useTitulo('Minha conta');
  const { usuario, atualizarUsuario, sair } = useAuth();
  const navegar = useNavigate();
  const [dados, setDados] = useState(usuario);
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const tipo = usuario.tipo === 'INSTITUICAO' ? 'instituicao' : 'voluntario';

  useEffect(() => {
    api('/me').then((u) => {
      setDados(u);
      atualizarUsuario(u);
    }).catch(() => {});
  }, [atualizarUsuario]);

  async function salvar(e) {
    e.preventDefault();
    setEnviando(true);
    setAviso(null);
    const campos =
      tipo === 'instituicao'
        ? ['email', 'nome', 'descricao', 'area_atuacao', 'contato']
        : ['email', 'nome', 'contato', 'areas_interesse'];
    try {
      const u = await api('/me', { metodo: 'PUT', corpo: Object.fromEntries(campos.map((c) => [c, dados[c]])) });
      atualizarUsuario(u);
      setAviso({ tipo: 'ok', texto: 'Alterações salvas.' });
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e.message });
    } finally {
      setEnviando(false);
    }
  }

  async function excluir() {
    const aviso =
      tipo === 'instituicao'
        ? 'Excluir sua conta apaga a instituição, todas as demandas e as inscrições delas. Não dá para desfazer. Continuar?'
        : 'Excluir sua conta apaga seus dados e todas as suas inscrições. Não dá para desfazer. Continuar?';
    if (!window.confirm(aviso)) return;
    try {
      await api('/me', { metodo: 'DELETE' });
      sair();
      navegar('/', { replace: true });
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e.message });
    }
  }

  function terminarSessao() {
    sair();
    navegar('/', { replace: true });
  }

  return (
    <section className="pagina pagina--estreita">
      <h1>Minha conta</h1>
      {tipo === 'instituicao' && (
        <p><Link to={`/instituicoes/${usuario.id}`}>Ver a página pública da instituição</Link></p>
      )}
      <form onSubmit={salvar} className="formulario">
        <CamposPerfil tipo={tipo} dados={dados} onChange={aoMudar(setDados)} />
        <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required value={dados.email} onChange={aoMudar(setDados)} />
        <Aviso tipo={aviso?.tipo}>{aviso?.texto}</Aviso>
        <button className="botao" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar alterações'}</button>
      </form>

      <div className="secao-conta">
        <h2>Sair</h2>
        <button className="botao botao--contorno" onClick={terminarSessao}>Sair da conta</button>
      </div>

      <div className="secao-conta">
        <h2>Excluir conta</h2>
        <p>Seus dados são apagados do Ajuda Aí de forma definitiva.</p>
        <button className="botao botao--perigo" onClick={excluir}>Excluir minha conta</button>
      </div>
    </section>
  );
}
