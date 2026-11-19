import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useTitulo } from '../hooks.js';
import { Aviso, Campo } from '../components/ui.jsx';

export default function RedefinirSenha() {
  useTitulo('Criar nova senha');
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState(null);
  const [feito, setFeito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (senha !== confirmacao) return setErro('As duas senhas estão diferentes.');
    setEnviando(true);
    setErro(null);
    try {
      await api('/auth/redefinir-senha', { metodo: 'POST', corpo: { token, senha } });
      setFeito(true);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (feito) {
    return (
      <section className="pagina pagina--estreita">
        <h1>Senha alterada</h1>
        <p>Pronto. Use a nova senha para entrar.</p>
        <Link className="botao" to="/entrar">Entrar</Link>
      </section>
    );
  }

  return (
    <section className="pagina pagina--estreita">
      <h1>Criar nova senha</h1>
      {!token ? (
        <p>Este link está incompleto. <Link to="/esqueci-senha">Peça um novo link</Link>.</p>
      ) : (
        <form onSubmit={enviar} className="formulario">
          <Campo rotulo="Nova senha" name="senha" type="password" autoComplete="new-password" required minLength={8} maxLength={72} dica="Pelo menos 8 caracteres." value={senha} onChange={(e) => setSenha(e.target.value)} />
          <Campo rotulo="Repita a nova senha" name="confirmacao" type="password" autoComplete="new-password" required value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
          <Aviso>{erro}</Aviso>
          <button className="botao botao--grande" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar nova senha'}</button>
        </form>
      )}
    </section>
  );
}
