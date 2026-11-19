import { Link } from 'react-router-dom';
import { useTitulo } from '../hooks.js';

export default function NaoEncontrada() {
  useTitulo('Página não encontrada');
  return (
    <section className="pagina">
      <h1>Página não encontrada</h1>
      <p>O endereço pode estar errado ou a página foi removida.</p>
      <Link className="botao" to="/">Ver demandas abertas</Link>
    </section>
  );
}
