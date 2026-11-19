import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

export const naoEncontrado = (mensagem) => new HttpError(404, mensagem);
export const proibido = (mensagem = 'Você não tem permissão para fazer isso.') => new HttpError(403, mensagem);
export const conflito = (mensagem) => new HttpError(409, mensagem);
export const requisicaoInvalida = (mensagem) => new HttpError(400, mensagem);

// Express reconhece o tratador de erros pelos 4 parâmetros.
// eslint-disable-next-line no-unused-vars
export function tratarErros(erro, req, res, next) {
  if (erro instanceof ZodError) {
    return res.status(400).json({ erro: erro.issues[0].message });
  }
  if (erro instanceof HttpError) {
    return res.status(erro.status).json({ erro: erro.message });
  }
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'O corpo da requisição não é um JSON válido.' });
  }
  // id que não é um uuid válido: tratado como inexistente
  if (erro.code === '22P02') {
    return res.status(404).json({ erro: 'Registro não encontrado.' });
  }
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno. Tente novamente em instantes.' });
}
