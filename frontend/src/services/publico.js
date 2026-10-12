// Leitura PÚBLICA dos dados (catálogo e configuração do site).
// Antes vinha do Firestore REST; agora vem do backend AudazSquad (FastAPI + Postgres).
// Mantém as mesmas funções que o DadosContext já usa.
import { listarCatalogo, obterConfigSite } from './api.js';

/** Configuração do site (config/site) — {} se ainda não foi salva. */
export const carregarSite = () => obterConfigSite();

/** Todos os empreendimentos, já com `slug`. */
export const carregarEmpreendimentos = () => listarCatalogo();
