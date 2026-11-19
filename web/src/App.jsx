import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { Protegida } from './components/ui.jsx';
import Demandas from './pages/Demandas.jsx';
import DemandaDetalhe from './pages/DemandaDetalhe.jsx';
import Entrar from './pages/Entrar.jsx';
import Cadastro from './pages/Cadastro.jsx';
import EsqueciSenha from './pages/EsqueciSenha.jsx';
import RedefinirSenha from './pages/RedefinirSenha.jsx';
import Conta from './pages/Conta.jsx';
import MinhasInscricoes from './pages/MinhasInscricoes.jsx';
import Painel from './pages/Painel.jsx';
import DemandaForm from './pages/DemandaForm.jsx';
import Inscritos from './pages/Inscritos.jsx';
import Instituicao from './pages/Instituicao.jsx';
import Privacidade from './pages/Privacidade.jsx';
import NaoEncontrada from './pages/NaoEncontrada.jsx';

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Demandas />} />
        <Route path="demandas/nova" element={<Protegida tipo="INSTITUICAO"><DemandaForm /></Protegida>} />
        <Route path="demandas/:id" element={<DemandaDetalhe />} />
        <Route path="demandas/:id/editar" element={<Protegida tipo="INSTITUICAO"><DemandaForm /></Protegida>} />
        <Route path="demandas/:id/inscritos" element={<Protegida tipo="INSTITUICAO"><Inscritos /></Protegida>} />
        <Route path="instituicoes/:id" element={<Instituicao />} />
        <Route path="entrar" element={<Entrar />} />
        <Route path="cadastro" element={<Cadastro />} />
        <Route path="esqueci-senha" element={<EsqueciSenha />} />
        <Route path="redefinir-senha" element={<RedefinirSenha />} />
        <Route path="conta" element={<Protegida><Conta /></Protegida>} />
        <Route path="minhas-inscricoes" element={<Protegida tipo="VOLUNTARIO"><MinhasInscricoes /></Protegida>} />
        <Route path="painel" element={<Protegida tipo="INSTITUICAO"><Painel /></Protegida>} />
        <Route path="privacidade" element={<Privacidade />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  );
}
