import { useTitulo } from '../hooks.js';

export default function Privacidade() {
  useTitulo('Política de privacidade');
  return (
    <section className="pagina pagina--estreita prosa">
      <h1>Política de privacidade</h1>
      <p>O Ajuda Aí coleta só o necessário para ligar voluntários a instituições, conforme a Lei Geral de Proteção de Dados (LGPD).</p>
      <h2>O que guardamos</h2>
      <p>Voluntários: nome, e-mail, telefone e, se você quiser, áreas de interesse. Instituições: nome, descrição, área de atuação, telefone e e-mail. Guardamos também a data em que você aceitou esta política e as inscrições feitas.</p>
      <h2>Quem vê seus dados</h2>
      <p>Seu telefone e e-mail só aparecem para a instituição das demandas em que você se inscreveu. As páginas públicas mostram apenas dados das demandas, das instituições e números somados, sem nomes de voluntários.</p>
      <h2>Como protegemos</h2>
      <p>A senha é guardada de forma cifrada (hash), a comunicação usa HTTPS e cada conta só acessa o que é seu.</p>
      <h2>Seus direitos</h2>
      <p>Você pode ver e corrigir seus dados em Minha conta e excluir a conta quando quiser. A exclusão apaga seus dados de forma definitiva.</p>
    </section>
  );
}
