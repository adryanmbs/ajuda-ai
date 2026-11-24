import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export function Campo({ rotulo, dica, multilinha, id, ...props }) {
  const idCampo = id || props.name;
  const Tag = multilinha ? 'textarea' : 'input';
  return (
    <div className="campo">
      <label htmlFor={idCampo}>
        {rotulo}
        {props.required && <Obrigatorio />}
      </label>
      <Tag id={idCampo} aria-describedby={dica ? `${idCampo}-dica` : undefined} {...props} />
      {dica && <p className="campo__dica" id={`${idCampo}-dica`}>{dica}</p>}
    </div>
  );
}

// O asterisco é só visual: o atributo required já avisa leitores de tela.
export function Obrigatorio() {
  return <span className="obrigatorio" aria-hidden="true"> *</span>;
}

export function NotaObrigatorios() {
  return (
    <p className="nota-obrigatorios">
      Campos com <span className="obrigatorio" aria-hidden="true">*</span>
      <span className="sr-only">asterisco</span> são obrigatórios.
    </p>
  );
}

export function Aviso({ tipo = 'erro', children }) {
  if (!children) return null;
  return (
    <p className={`aviso aviso--${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

export function Carregando() {
  return <p className="carregando" role="status">Carregando…</p>;
}

// Exige login (e, opcionalmente, um tipo de conta) para mostrar a página.
export function Protegida({ tipo, children }) {
  const { usuario } = useAuth();
  const local = useLocation();
  if (!usuario) return <Navigate to={`/entrar?volta=${encodeURIComponent(local.pathname)}`} replace />;
  if (tipo && usuario.tipo !== tipo) {
    return (
      <section className="pagina">
        <h1>Página indisponível</h1>
        <p>
          {tipo === 'INSTITUICAO'
            ? 'Esta página é só para contas de instituição.'
            : 'Esta página é só para contas de voluntário.'}
        </p>
      </section>
    );
  }
  return children;
}

// Atualiza o formulário a partir do evento de mudança de qualquer campo.
export const aoMudar = (setDados) => (e) => {
  const { name, value, type, checked } = e.target;
  setDados((d) => ({ ...d, [name]: type === 'checkbox' ? checked : value }));
};
