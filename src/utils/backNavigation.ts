// BUG-01.1 — regras puras do modelo de navegação Back (3 níveis fixos:
// overlay > drill > aba). Extraído do hook (useBackNavigation.ts) porque o
// hook em si depende de window.history/popstate — sem jsdom no projeto, só a
// classificação de nível é testável com a infraestrutura atual (vitest com
// environment: 'node'). Nenhum dos dois arquivos conhece modal/aba/paciente
// específicos — só os três tipos abaixo.

export type BackLevelKind = 'drill' | 'tab' | 'overlay';

export interface BackNavFlags {
  hasDrill: boolean;
  hasTab: boolean;
  hasOverlay: boolean;
}

// Ordem fixa drill → aba → overlay: é também a única ordem em que o próprio
// app consegue produzi-los (drill só começa em repouso; aba só existe depois
// de já estar dentro de patient_app; overlay sempre abre por cima do que já
// estiver na tela) — então esta lista serve tanto pra "o que está ativo
// agora" quanto, invertida, pra prioridade de resolução do Back.
export function activeKinds(flags: BackNavFlags): BackLevelKind[] {
  const kinds: BackLevelKind[] = [];
  if (flags.hasDrill) kinds.push('drill');
  if (flags.hasTab) kinds.push('tab');
  if (flags.hasOverlay) kinds.push('overlay');
  return kinds;
}

export function depthOf(flags: BackNavFlags): number {
  return activeKinds(flags).length;
}

// Qual nível o Back deve resolver agora, dado o estado atual — null quando já
// em repouso (nada pro Back consumir internamente, comportamento normal do
// navegador assume).
export function nextPopKind(flags: BackNavFlags): BackLevelKind | null {
  if (flags.hasOverlay) return 'overlay';
  if (flags.hasTab) return 'tab';
  if (flags.hasDrill) return 'drill';
  return null;
}
