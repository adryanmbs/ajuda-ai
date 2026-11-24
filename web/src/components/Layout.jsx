import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

function Icone() {
  return (
    <svg className="marca__icone" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#6E2A6B" />
      <g fill="#F5B81B">
        {[0, 72, 144, 216, 288].map((g) => (
          <ellipse key={g} cx="16" cy="9.6" rx="4.3" ry="5.6" transform={`rotate(${g} 16 16.4)`} />
        ))}
      </g>
      <circle cx="16" cy="16.4" r="3.4" fill="#6E2A6B" />
    </svg>
  );
}

const iniciais = (nome = '') =>
  nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

// Links principais de cada tipo de conta. No celular eles vão para dentro do menu da conta.
function linksDe(usuario) {
  if (usuario?.tipo === 'INSTITUICAO') {
    return [
      { para: '/', texto: 'Demandas', end: true },
      { para: '/painel', texto: 'Painel' },
    ];
  }
  if (usuario?.tipo === 'VOLUNTARIO') {
    return [
      { para: '/', texto: 'Demandas', end: true },
      { para: '/minhas-inscricoes', texto: 'Minhas inscrições' },
    ];
  }
  return [{ para: '/', texto: 'Demandas', end: true }];
}

function MenuConta({ usuario, links }) {
  const { sair } = useAuth();
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const [aberto, setAberto] = useState(false);
  const raiz = useRef(null);
  const botao = useRef(null);

  // Fecha ao trocar de página, ao clicar fora e com Esc.
  useEffect(() => {
    setAberto(false);
  }, [pathname]);
  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => {
      if (!raiz.current?.contains(e.target)) setAberto(false);
    };
    const tecla = (e) => {
      if (e.key === 'Escape') {
        setAberto(false);
        botao.current?.focus();
      }
    };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  function terminarSessao() {
    sair();
    navegar('/', { replace: true });
  }

  const instituicao = usuario.tipo === 'INSTITUICAO';

  return (
    <div className="conta" ref={raiz}>
      <button
        ref={botao}
        type="button"
        className="conta__botao"
        aria-expanded={aberto}
        aria-controls="menu-conta"
        onClick={() => setAberto((a) => !a)}
      >
        <span className="conta__avatar" aria-hidden="true">{iniciais(usuario.nome)}</span>
        <span className="conta__nome">{usuario.nome.split(' ')[0]}</span>
        <span className="sr-only">, menu da conta</span>
        <svg className="conta__seta" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </button>
      {aberto && (
        <div className="conta__menu" id="menu-conta">
          <div className="conta__quem">
            <strong>{usuario.nome}</strong>
            <span>{usuario.email}</span>
          </div>
          <ul className="conta__lista conta__lista--celular">
            {links.map((l) => (
              <li key={l.para}>
                <NavLink to={l.para} end={l.end}>{l.texto}</NavLink>
              </li>
            ))}
            {instituicao && (
              <li>
                <NavLink to="/demandas/nova">Publicar demanda</NavLink>
              </li>
            )}
          </ul>
          <ul className="conta__lista">
            <li>
              <NavLink to="/conta">Minha conta</NavLink>
            </li>
            {instituicao && (
              <li>
                <Link to={`/instituicoes/${usuario.id}`}>Página pública</Link>
              </li>
            )}
            <li>
              <button type="button" className="conta__sair" onClick={terminarSessao}>
                Sair
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { usuario } = useAuth();
  const links = linksDe(usuario);

  return (
    <>
      <a className="pular" href="#conteudo">Pular para o conteúdo</a>
      <header className="topo">
        <div className="topo__dentro">
          <Link to="/" className="marca" aria-label="Ajuda Aí, página inicial">
            <Icone />
            Ajuda Aí
          </Link>
          <nav className="nav" aria-label="Principal">
            <ul className={usuario ? 'nav__links nav__links--logado' : 'nav__links'}>
              {links.map((l) => (
                <li key={l.para} className={usuario ? undefined : 'nav__so-largo'}>
                  <NavLink to={l.para} end={l.end}>{l.texto}</NavLink>
                </li>
              ))}
              {!usuario && (
                <>
                  <li><NavLink to="/entrar">Entrar</NavLink></li>
                  <li><NavLink to="/cadastro" className="nav__destaque">Criar conta</NavLink></li>
                </>
              )}
            </ul>
            {usuario && <MenuConta usuario={usuario} links={links} />}
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
