import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, salvarToken, tokenSalvo } from './api.js';

const CHAVE_USUARIO = 'ajudaai.usuario';
const AuthContext = createContext(null);

function usuarioSalvo() {
  try {
    return tokenSalvo() ? JSON.parse(localStorage.getItem(CHAVE_USUARIO)) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(usuarioSalvo);

  const atualizarUsuario = useCallback((u) => {
    setUsuario(u);
    if (u) localStorage.setItem(CHAVE_USUARIO, JSON.stringify(u));
    else localStorage.removeItem(CHAVE_USUARIO);
  }, []);

  const entrar = useCallback(({ token, usuario }) => {
    salvarToken(token);
    atualizarUsuario(usuario);
  }, [atualizarUsuario]);

  const sair = useCallback(() => {
    salvarToken(null);
    atualizarUsuario(null);
  }, [atualizarUsuario]);

  // Confere o token salvo ao abrir o site e sai se a sessão expirar.
  useEffect(() => {
    if (tokenSalvo()) api('/me').then(atualizarUsuario).catch(() => {});
    window.addEventListener('ajudaai:sessao-expirada', sair);
    return () => window.removeEventListener('ajudaai:sessao-expirada', sair);
  }, [atualizarUsuario, sair]);

  return (
    <AuthContext.Provider value={{ usuario, entrar, sair, atualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
