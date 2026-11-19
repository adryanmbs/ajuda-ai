-- Modelo de dados do Ajuda Aí (ver Documento de Modelagem, Figura 2)

CREATE TABLE IF NOT EXISTS usuario (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 varchar(254) NOT NULL UNIQUE,
  senha_hash            varchar(100) NOT NULL,
  tipo                  varchar(12)  NOT NULL CHECK (tipo IN ('VOLUNTARIO', 'INSTITUICAO')),
  consentimento_lgpd_em timestamptz  NOT NULL,
  criado_em             timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voluntario (
  usuario_id      uuid PRIMARY KEY REFERENCES usuario (id) ON DELETE CASCADE,
  nome            varchar(120) NOT NULL,
  contato         varchar(120) NOT NULL,
  areas_interesse text
);

CREATE TABLE IF NOT EXISTS instituicao (
  usuario_id   uuid PRIMARY KEY REFERENCES usuario (id) ON DELETE CASCADE,
  nome         varchar(120) NOT NULL,
  descricao    text         NOT NULL,
  area_atuacao varchar(120) NOT NULL,
  contato      varchar(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS token_redefinicao_senha (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid        NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
  token_hash varchar(64) NOT NULL UNIQUE,
  expira_em  timestamptz NOT NULL,
  usado_em   timestamptz
);

CREATE TABLE IF NOT EXISTS demanda (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id uuid         NOT NULL REFERENCES instituicao (usuario_id) ON DELETE CASCADE,
  titulo         varchar(120) NOT NULL,
  descricao      text         NOT NULL,
  data           timestamptz  NOT NULL,
  local          varchar(200) NOT NULL,
  num_vagas      int          NOT NULL CHECK (num_vagas > 0),
  status         varchar(10)  NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA', 'CONCLUIDA', 'CANCELADA'))
);

CREATE INDEX IF NOT EXISTS demanda_data_idx ON demanda (data);

CREATE TABLE IF NOT EXISTS inscricao (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voluntario_id uuid        NOT NULL REFERENCES voluntario (usuario_id) ON DELETE CASCADE,
  demanda_id    uuid        NOT NULL REFERENCES demanda (id) ON DELETE CASCADE,
  criada_em     timestamptz NOT NULL DEFAULT now(),
  status        varchar(10) NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA', 'CANCELADA'))
);

-- Um voluntário só pode ter uma inscrição ativa por demanda.
CREATE UNIQUE INDEX IF NOT EXISTS inscricao_ativa_unica
  ON inscricao (voluntario_id, demanda_id) WHERE status = 'ATIVA';
