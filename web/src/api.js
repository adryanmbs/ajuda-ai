const CHAVE_TOKEN = 'ajudaai.token';

export const tokenSalvo = () => localStorage.getItem(CHAVE_TOKEN);
export const salvarToken = (token) =>
  token ? localStorage.setItem(CHAVE_TOKEN, token) : localStorage.removeItem(CHAVE_TOKEN);

export class ErroApi extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

// Chama a API com o token salvo. Lança ErroApi com a mensagem vinda do servidor.
export async function api(caminho, { metodo = 'GET', corpo } = {}) {
  const headers = {};
  if (corpo !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenSalvo();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api${caminho}`, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ErroApi(0, 'Sem conexão com o servidor. Verifique sua internet e tente de novo.');
  }

  if (res.status === 204) return null;
  const dados = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event('ajudaai:sessao-expirada'));
    throw new ErroApi(res.status, dados.erro || 'Algo deu errado. Tente de novo.');
  }
  return dados;
}
