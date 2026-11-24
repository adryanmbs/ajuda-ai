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
            <svg className="marca__icone" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="#6E2A6B" />
              <g fill="#F5B81B">
                {[0, 72, 144, 216, 288].map((g) => (
                  <ellipse key={g} cx="16" cy="9.6" rx="4.3" ry="5.6" transform={`rotate(${g} 16 16.4)`} />
                ))}
              </g>
              <circle cx="16" cy="16.4" r="3.4" fill="#6E2A6B" />
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
