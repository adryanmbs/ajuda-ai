import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { tratarErros } from './errors.js';
import authRotas from './routes/auth.js';
import meRotas from './routes/me.js';
import demandasRotas from './routes/demandas.js';
import inscricoesRotas from './routes/inscricoes.js';
import instituicoesRotas from './routes/instituicoes.js';

const pastaDoFront = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');

export function criarApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();
  api.use(authRotas, meRotas, demandasRotas, inscricoesRotas, instituicoesRotas);
  api.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
  app.use('/api', api);

  // Em produção, o mesmo servidor entrega o front-end já compilado.
  if (existsSync(pastaDoFront)) {
    app.use(express.static(pastaDoFront));
    app.get('/{*caminho}', (req, res) => res.sendFile(path.join(pastaDoFront, 'index.html')));
  }

  app.use(tratarErros);
  return app;
}
