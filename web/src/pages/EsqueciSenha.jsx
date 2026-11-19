import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useTitulo } from '../hooks.js';
import { Aviso, Campo } from '../components/ui.jsx';

export default function EsqueciSenha() {
  useTitulo('Esqueci minha senha');
  const [email, setEmail] = useState('');
  const [resultado, setResultado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      const r = await api('/auth/esqueci-senha', { metodo: 'POST', corpo: { email } });
      setResultado({ tipo: 'ok', texto: r.mensagem });
    } catch (e) {
      setResultado({ tipo: 'erro', texto: e.message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="pagina pagina--estreita">
      <h1>Esqueci minha senha</h1>
      <p>Informe o e-mail da sua conta. Enviamos um link para você criar uma senha nova.</p>
      <form onSubmit={enviar} className="formulario">
        <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Aviso tipo={resultado?.tipo}>{resultado?.texto}</Aviso>
        <button className="botao botao--grande" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar link'}</button>
      </form>
      <p className="links-extra"><Link to="/entrar">Voltar para Entrar</Link></p>
    </section>
  );
}
