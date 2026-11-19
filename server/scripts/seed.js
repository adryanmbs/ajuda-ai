// Recria dados de demonstração. Apaga tudo que existe no banco!
// Contas criadas (senha de todas: ajudaai123):
//   casalar@exemplo.com     instituição
//   biblioteca@exemplo.com  instituição
//   joana@exemplo.com       voluntária
//   pedro@exemplo.com       voluntário
import bcrypt from 'bcryptjs';
import { iniciarBanco, query, fecharBanco } from '../src/db.js';

const SENHA = 'ajudaai123';
const dia = (dias, hora = 9) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  d.setHours(hora, 0, 0, 0);
  return d;
};

await iniciarBanco();
await query('TRUNCATE usuario CASCADE');
const hash = await bcrypt.hash(SENHA, 10);

async function usuario(email, tipo) {
  const { rows } = await query(
    'INSERT INTO usuario (email, senha_hash, tipo, consentimento_lgpd_em) VALUES ($1, $2, $3, now()) RETURNING id',
    [email, hash, tipo],
  );
  return rows[0].id;
}

async function instituicao(email, nome, descricao, area, contato) {
  const id = await usuario(email, 'INSTITUICAO');
  await query('INSERT INTO instituicao VALUES ($1, $2, $3, $4, $5)', [id, nome, descricao, area, contato]);
  return id;
}

async function voluntario(email, nome, contato, areas) {
  const id = await usuario(email, 'VOLUNTARIO');
  await query('INSERT INTO voluntario VALUES ($1, $2, $3, $4)', [id, nome, contato, areas]);
  return id;
}

async function demanda(inst, titulo, descricao, data, local, vagas, status = 'ABERTA') {
  const { rows } = await query(
    `INSERT INTO demanda (instituicao_id, titulo, descricao, data, local, num_vagas, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [inst, titulo, descricao, data, local, vagas, status],
  );
  return rows[0].id;
}

const inscrever = (vol, dem) => query('INSERT INTO inscricao (voluntario_id, demanda_id) VALUES ($1, $2)', [vol, dem]);

const casaLar = await instituicao(
  'casalar@exemplo.com',
  'Casa Lar Esperança',
  'Acolhemos 18 crianças e adolescentes em Ouro Preto. Precisamos de gente para manutenção da casa, reforço escolar e passeios.',
  'Assistência social',
  '(31) 3551-0000',
);
const biblioteca = await instituicao(
  'biblioteca@exemplo.com',
  'Biblioteca Comunitária São Sebastião',
  'Biblioteca de bairro mantida por moradores, com rodas de leitura para crianças e oficinas para adultos.',
  'Educação e cultura',
  '(31) 98765-4321',
);
const joana = await voluntario('joana@exemplo.com', 'Joana Ribeiro', '(31) 99111-2222', 'Educação, leitura');
const pedro = await voluntario('pedro@exemplo.com', 'Pedro Alves', '(31) 99333-4444', 'Reformas, pintura');

const pintura = await demanda(casaLar, 'Mutirão de pintura dos quartos',
  'Vamos pintar três quartos e o corredor. Tinta e rolos estão garantidos; traga roupa que possa sujar. Lanche no fim da manhã.',
  dia(5, 8), 'Rua Padre Rolim, 120, São Cristóvão, Ouro Preto', 8);
await inscrever(pedro, pintura);
await inscrever(joana, pintura);

const reforco = await demanda(casaLar, 'Reforço escolar de matemática',
  'Ajudar crianças do 4º ao 7º ano com as tarefas da semana. Não precisa ser professor, só ter paciência.',
  dia(9, 14), 'Rua Padre Rolim, 120, São Cristóvão, Ouro Preto', 3);
await inscrever(joana, reforco);

await demanda(biblioteca, 'Roda de leitura no sábado',
  'Ler histórias em voz alta para crianças de 5 a 9 anos. Escolhemos os livros juntos antes da roda.',
  dia(12, 10), 'Praça do bairro São Sebastião, Ouro Preto', 4);

await demanda(biblioteca, 'Catalogar doações de livros',
  'Chegaram cerca de 400 livros doados. Precisamos separar por faixa etária e registrar na planilha da biblioteca.',
  dia(19, 9), 'Rua São Sebastião, 45, Ouro Preto', 6);

await demanda(casaLar, 'Passeio ao Parque do Itacolomi',
  'Acompanhar o grupo de adolescentes num passeio de um dia. Cada adulto fica responsável por até 3 jovens.',
  dia(26, 7), 'Saída da Casa Lar, São Cristóvão, Ouro Preto', 5);

// histórico já concluído, para o painel de impacto
const feira = await demanda(casaLar, 'Feira de troca de roupas',
  'Organização das bancas e atendimento na feira de troca.', dia(-20, 9),
  'Praça Tiradentes, Ouro Preto', 6, 'CONCLUIDA');
await inscrever(pedro, feira);
await inscrever(joana, feira);
const horta = await demanda(biblioteca, 'Plantio da horta comunitária',
  'Preparar os canteiros e plantar as primeiras mudas.', dia(-35, 8),
  'Terreno ao lado da biblioteca, São Sebastião', 5, 'CONCLUIDA');
await inscrever(joana, horta);

console.log(`Dados de demonstração criados. Senha de todas as contas: ${SENHA}`);
await fecharBanco();
