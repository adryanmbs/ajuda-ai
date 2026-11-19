import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

// Busca um recurso da API e devolve { dados, erro, carregando, recarregar }.
export function useApi(caminho) {
  const [estado, setEstado] = useState({ dados: null, erro: null, carregando: true });

  const carregar = useCallback(async () => {
    if (!caminho) return;
    setEstado((e) => ({ ...e, carregando: true }));
    try {
      setEstado({ dados: await api(caminho), erro: null, carregando: false });
    } catch (erro) {
      setEstado({ dados: null, erro, carregando: false });
    }
  }, [caminho]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { ...estado, recarregar: carregar };
}

export function useTitulo(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} | Ajuda Aí` : 'Ajuda Aí';
  }, [titulo]);
}
