// Formatação e helpers puros (sem React) — fáceis de testar e reaproveitar.

export function formatarDataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data} às ${hora}`;
}

export function tempoRelativo(iso, agora = new Date()) {
  if (!iso) return '';
  const diffMin = Math.round((agora - new Date(iso)) / 60000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.round(h / 24);
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  return formatarDataHora(iso).split(' às ')[0];
}

export const ehRecente = (iso, dias = 7) => !!iso && Date.now() - new Date(iso) < dias * 864e5;

// Remove acentos e caixa para busca tolerante ("passare" encontra "Passaré").
export const normalizar = (texto = '') =>
  texto.toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
