import { plural } from '../formato.js';

const MAX_JANELAS = 12;

// Medidor de vagas: uma "janela" por vaga, preenchida quando ocupada.
export default function Vagas({ total, ocupadas, grande = false }) {
  const livres = Math.max(total - ocupadas, 0);
  const texto =
    livres === 0 ? 'Vagas esgotadas' : `${plural(livres, 'vaga livre', 'vagas livres')} de ${total}`;

  return (
    <div className={`vagas${grande ? ' vagas--grande' : ''}${livres === 0 ? ' vagas--esgotada' : ''}`}>
      {total <= MAX_JANELAS ? (
        <span className="vagas__janelas" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={i < ocupadas ? 'janela janela--ocupada' : 'janela'} />
          ))}
        </span>
      ) : (
        <span className="vagas__barra" aria-hidden="true">
          <span style={{ width: `${Math.min(ocupadas / total, 1) * 100}%` }} />
        </span>
      )}
      <span className="vagas__texto">{texto}</span>
    </div>
  );
}
