const FUSO = 'America/Sao_Paulo';
const fmt = (opcoes) => new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, ...opcoes });

export const diaDoMes = (d) => fmt({ day: 'numeric' }).format(new Date(d));
export const mesCurto = (d) => fmt({ month: 'short' }).format(new Date(d)).replace('.', '');
export const diaSemana = (d) => fmt({ weekday: 'long' }).format(new Date(d));
// 08:00 -> 8h, 14:30 -> 14h30
export const hora = (d) =>
  fmt({ hour: '2-digit', minute: '2-digit' }).format(new Date(d)).replace(/^0/, '').replace(':00', 'h').replace(':', 'h');
const maiuscula = (t) => t[0].toUpperCase() + t.slice(1);
export const dataLonga = (d) => maiuscula(fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(d)));
export const dataCurta = (d) => fmt({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));

export const quando = (d) => maiuscula(`${diaSemana(d)}, ${hora(d)}`);

export const jaPassou = (d) => new Date(d) <= new Date();

// Converte entre ISO e o valor do <input type="datetime-local"> no horário do navegador.
export function paraInputLocal(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export const deInputLocal = (valor) => (valor ? new Date(valor).toISOString() : '');

export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
