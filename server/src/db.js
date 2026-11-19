import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';

const aqui = path.dirname(fileURLToPath(import.meta.url));

// query(sql, params) e transaction(fn) funcionam igual com Postgres real (pg) ou embutido (PGlite).
let banco;

export async function iniciarBanco({ memoria = false } = {}) {
  const schema = await readFile(path.join(aqui, 'schema.sql'), 'utf8');

  if (process.env.DATABASE_URL && !memoria) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    banco = {
      query: (sql, params) => pool.query(sql, params),
      async transaction(fn) {
        const cliente = await pool.connect();
        try {
          await cliente.query('BEGIN');
          const resultado = await fn((sql, params) => cliente.query(sql, params));
          await cliente.query('COMMIT');
          return resultado;
        } catch (erro) {
          await cliente.query('ROLLBACK');
          throw erro;
        } finally {
          cliente.release();
        }
      },
      fechar: () => pool.end(),
    };
    await pool.query(schema);
    return;
  }

  let dir;
  if (!memoria) {
    dir = path.join(aqui, '..', '.data', 'pglite');
    await mkdir(dir, { recursive: true });
  }
  const pglite = new PGlite(dir);
  banco = {
    query: (sql, params) => pglite.query(sql, params),
    transaction: (fn) => pglite.transaction((tx) => fn((sql, params) => tx.query(sql, params))),
    fechar: () => pglite.close(),
  };
  await pglite.exec(schema);
}

export const query = (sql, params) => banco.query(sql, params);
export const transaction = (fn) => banco.transaction(fn);
export const fecharBanco = () => banco?.fechar();
