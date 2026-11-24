import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useTitulo } from '../hooks.js';
import { Aviso, Campo, NotaObrigatorios, Obrigatorio, aoMudar } from '../components/ui.jsx';
import { destinoSeguro, inicioDo } from './Entrar.jsx';

export function CamposPerfil({ tipo, dados, onChange }) {
  if (tipo === 'instituicao') {
    return (
      <>
        <Campo rotulo="Nome da instituição" name="nome" required maxLength={120} value={dados.nome} onChange={onChange} />
        <Campo
          rotulo="Sobre a instituição"
          name="descricao"
          multilinha
          rows={4}
          required
          maxLength={2000}
          dica="Quem vocês atendem e que tipo de ajuda costumam precisar. Aparece na sua página pública."
          value={dados.descricao}
          onChange={onChange}
        />
        <Campo rotulo="Área de atuação" name="area_atuacao" required maxLength={120} placeholder="Ex.: Educação, Saúde, Meio ambiente" value={dados.area_atuacao} onChange={onChange} />
        <Campo rotulo="Telefone ou WhatsApp" name="contato" type="tel" autoComplete="tel" required maxLength={120} value={dados.contato} onChange={onChange} />
      </>
    );
  }
  return (
    <>
      <Campo rotulo="Seu nome" name="nome" autoComplete="name" required maxLength={120} value={dados.nome} onChange={onChange} />
      <Campo
        rotulo="Telefone ou WhatsApp"
        name="contato"
        type="tel"
        autoComplete="tel"
        required
        maxLength={120}
        dica="Só a instituição das demandas em que você se inscrever vê este número."
        value={dados.contato}
        onChange={onChange}
      />
      <Campo
        rotulo="Áreas de interesse (opcional)"
        name="areas_interesse"
        maxLength={500}
        placeholder="Ex.: crianças, reformas, cozinha"
        value={dados.areas_interesse || ''}
        onChange={onChange}
      />
    </>
  );
}

const vazio = { nome: '', email: '', senha: '', contato: '', areas_interesse: '', descricao: '', area_atuacao: '', aceite_lgpd: false };

export default function Cadastro() {
  useTitulo('Criar conta');
  const { usuario, entrar } = useAuth();
  const navegar = useNavigate();
  const [params, setParams] = useSearchParams();
  const tipo = params.get('tipo') === 'instituicao' ? 'instituicao' : 'voluntario';
  const volta = destinoSeguro(params.get('volta'));
  const [dados, setDados] = useState(vazio);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const mudar = aoMudar(setDados);

  if (usuario) return <Navigate to={inicioDo(usuario)} replace />;

  function trocarTipo(novo) {
    const p = new URLSearchParams(params);
    p.set('tipo', novo);
    setParams(p, { replace: true });
    setErro(null);
  }

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    const campos =
      tipo === 'instituicao'
        ? ['nome', 'email', 'senha', 'descricao', 'area_atuacao', 'contato', 'aceite_lgpd']
        : ['nome', 'email', 'senha', 'contato', 'areas_interesse', 'aceite_lgpd'];
    const corpo = Object.fromEntries(campos.map((c) => [c, dados[c]]));
    try {
      const resposta = await api(`/auth/cadastro/${tipo}`, { metodo: 'POST', corpo });
      entrar(resposta);
      navegar(tipo === 'instituicao' ? '/painel' : volta || '/', { replace: true });
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <section className="pagina pagina--estreita">
      <h1>Criar conta</h1>
      <fieldset className="escolha">
        <legend>Como você quer usar o Ajuda Aí?</legend>
        <label className={tipo === 'voluntario' ? 'escolha__opcao escolha__opcao--ativa' : 'escolha__opcao'}>
          <input type="radio" name="tipo" checked={tipo === 'voluntario'} onChange={() => trocarTipo('voluntario')} />
          <strong>Quero ajudar</strong>
          <span>Encontro demandas e me inscrevo como voluntário.</span>
        </label>
        <label className={tipo === 'instituicao' ? 'escolha__opcao escolha__opcao--ativa' : 'escolha__opcao'}>
          <input type="radio" name="tipo" checked={tipo === 'instituicao'} onChange={() => trocarTipo('instituicao')} />
          <strong>Represento uma instituição</strong>
          <span>Publico demandas e organizo os inscritos.</span>
        </label>
      </fieldset>

      <form onSubmit={enviar} className="formulario">
        <NotaObrigatorios />
        <CamposPerfil tipo={tipo} dados={dados} onChange={mudar} />
        <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required value={dados.email} onChange={mudar} />
        <Campo
          rotulo="Senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          dica="Pelo menos 8 caracteres."
          value={dados.senha}
          onChange={mudar}
        />
        <label className="marcar">
          <input type="checkbox" name="aceite_lgpd" checked={dados.aceite_lgpd} onChange={mudar} required />
          <span>
            Li e aceito a <Link to="/privacidade" target="_blank">política de privacidade</Link>.
            <Obrigatorio />
          </span>
        </label>
        <Aviso>{erro}</Aviso>
        <button className="botao botao--grande" disabled={enviando}>
          {enviando ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>
      <p className="links-extra">
        Já tem conta? <Link to="/entrar">Entrar</Link>
      </p>
    </section>
  );
}
