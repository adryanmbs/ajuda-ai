import { criarApp } from './app.js';
import { iniciarBanco } from './db.js';

// Em desenvolvimento a porta vem fixa do script (--porta=3000), pois o proxy do Vite aponta para ela.
const argPorta = process.argv.find((a) => a.startsWith('--porta='))?.split('=')[1];
const porta = Number(argPorta || process.env.PORT || 3000);

await iniciarBanco();
criarApp().listen(porta, () => {
  console.log(`Ajuda Aí API em http://localhost:${porta}/api`);
  if (!process.env.DATABASE_URL) console.log('Banco: PGlite local em server/.data (defina DATABASE_URL para usar um PostgreSQL).');
});
