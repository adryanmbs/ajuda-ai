import jwt from 'jsonwebtoken';
import { HttpError, proibido } from './errors.js';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('Defina JWT_SECRET em produção.');
}
const SEGREDO = process.env.JWT_SECRET || 'segredo-de-desenvolvimento';

export const gerarToken = (usuario) =>
  jwt.sign({ sub: usuario.id, tipo: usuario.tipo }, SEGREDO, { expiresIn: '2h' });

function lerToken(req) {
  const [esquema, token] = (req.headers.authorization || '').split(' ');
  if (esquema !== 'Bearer' || !token) return null;
  try {
    const { sub, tipo } = jwt.verify(token, SEGREDO);
    return { id: sub, tipo };
  } catch {
    throw new HttpError(401, 'Sua sessão expirou. Entre novamente.');
  }
}

export function autenticar(req, res, next) {
  req.usuario = lerToken(req);
  if (!req.usuario) throw new HttpError(401, 'Entre na sua conta para continuar.');
  next();
}

// Para rotas públicas que mostram algo a mais quando há login.
export function autenticarOpcional(req, res, next) {
  try {
    req.usuario = lerToken(req);
  } catch {
    req.usuario = null;
  }
  next();
}

export const exigir = (tipo) => [
  autenticar,
  (req, res, next) => {
    if (req.usuario.tipo !== tipo) {
      throw proibido(
        tipo === 'INSTITUICAO'
          ? 'Apenas instituições podem fazer isso.'
          : 'Apenas voluntários podem fazer isso.',
      );
    }
    next();
  },
];
