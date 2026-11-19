import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useTitulo } from '../hooks.js';
import { Aviso, Campo, aoMudar } from '../components/ui.jsx';

// Só aceita voltar para caminhos internos.
export const destinoSeguro = (volta) => (volta?.startsWith('/') && !volta.startsWith('//') ? volta : null);
export const inicioDo = (usuario) => (usuario.tipo === 'INSTITUICAO' ? '/painel' : '/');

export default function Entrar() {
  useTitulo('Entrar');
  const { usuario, entrar } = useAuth();
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const volta = destinoSeguro(params.get('volta'));
  const [dados, setDados] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={volta || inicioDo(usuario)} replace />;

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const resposta = await api('/auth/login', { metodo: 'POST', corpo: dados });
      entrar(resposta);
      navegar(volta || inicioDo(resposta.usuario), { replace: true });
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <section className="pagina pagina--estreita">
      <h1>Entrar</h1>
      <form onSubmit={enviar} className="formulario">
        <Aviso>{erro}</Aviso>
        <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required value={dados.email} onChange={aoMudar(setDados)} />
        <Campo rotulo="Senha" name="senha" type="password" autoComplete="current-password" required value={dados.senha} onChange={aoMudar(setDados)} />
        <button className="botao botao--grande" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <p className="links-extra">
        <Link to="/esqueci-senha">Esqueci minha senha</Link>
        <Link to={`/cadastro${volta ? `?volta=${encodeURIComponent(volta)}` : ''}`}>Criar uma conta</Link>
      </p>
    </section>
  );
}
