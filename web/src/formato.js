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

// Campos de data e hora são de texto com máscara: o <input type="date"> nativo mostra o formato
// do idioma do navegador (MM/DD/AAAA e AM/PM num Chrome em inglês), e a página não controla isso.
const doisDigitos = (n) => String(n).padStart(2, '0');

// "28112026" -> "28/11/2026"
export function mascaraData(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
}

// "1430" -> "14:30"
export function mascaraHora(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}

// "28/11/2026" -> "2026-11-28"; null se a data não existir (ex.: 31/02).
export function dataParaIso(texto) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!m) return null;
  const [, dia, mes, ano] = m.map(Number);
  const d = new Date(ano, mes - 1, dia);
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
}

// "2026-11-28" -> "28/11/2026"
export const isoParaData = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

export const horaValida = (texto) => /^([01]\d|2[0-3]):[0-5]\d$/.test(texto);

// Data e hora (no horário do navegador) <-> ISO com fuso, como a API espera.
export function separarDataHora(iso) {
  const d = new Date(iso);
  return {
    dia: `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}`,
    hora: `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`,
  };
}
export function juntarDataHora(dia, hora) {
  const iso = dataParaIso(dia);
  if (!iso || !horaValida(hora)) return null;
  return new Date(`${iso}T${hora}`).toISOString();
}

export const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
