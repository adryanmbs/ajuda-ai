import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Layout() {
  const { usuario } = useAuth();

  return (
    <>
      <a className="pular" href="#conteudo">Pular para o conteúdo</a>
      <header className="topo">
        <div className="topo__dentro">
          <Link to="/" className="marca" aria-label="Ajuda Aí, página inicial">
            <svg className="marca__icone" viewBox="0 0 20 26" aria-hidden="true">
              <path d="M1 25V10a9 9 0 0 1 18 0v15z" />
            </svg>
            Ajuda Aí
          </Link>
          <nav className="nav" aria-label="Principal">
            <NavLink to="/" end>Demandas</NavLink>
            {!usuario && (
              <>
                <NavLink to="/entrar">Entrar</NavLink>
                <NavLink to="/cadastro" className="nav__destaque">Criar conta</NavLink>
              </>
            )}
            {usuario?.tipo === 'VOLUNTARIO' && <NavLink to="/minhas-inscricoes">Minhas inscrições</NavLink>}
            {usuario?.tipo === 'INSTITUICAO' && (
              <>
                <NavLink to="/painel">Painel</NavLink>
                <NavLink to="/demandas/nova" className="nav__destaque">Publicar demanda</NavLink>
              </>
            )}
            {usuario && <NavLink to="/conta">Minha conta</NavLink>}
          </nav>
        </div>
      </header>
      <main id="conteudo" className="conteudo">
        <Outlet />
      </main>
      <footer className="rodape">
        <p>Ajuda Aí é um projeto do curso de Sistemas de Informação da UFOP.</p>
        <Link to="/privacidade">Política de privacidade</Link>
      </footer>
    </>
  );
}
