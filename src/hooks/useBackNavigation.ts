import { useEffect, useRef } from 'react';
import { activeKinds, depthOf, nextPopKind, type BackLevelKind, type BackNavFlags } from '../utils/backNavigation';

// BUG-01.1 — implementação do modelo aprovado em BUG-01 (3 níveis fixos:
// overlay > drill > aba, cada um substituindo — nunca empilhando — sucessivas
// transições do mesmo tipo). Este hook não sabe o que é um modal, uma aba ou
// uma paciente: ele só recebe 3 booleanos já calculados pelo chamador
// (hasDrill/hasTab/hasOverlay) e 3 callbacks de "resolver esse nível" — a
// classificação/prioridade em si mora em utils/backNavigation.ts (puro,
// testável sem window/history).
//
// Diferença deliberada em relação ao esboço original (pushLevel(kind) chamado
// manualmente em cada ponto que abre modal/aba/drill): aqui os 3 booleanos são
// *derivados* do estado que o app já muda por outros motivos (activeTab,
// currentScreen, os show*Modal) — nenhum call site novo precisa lembrar de
// "avisar" o hook. Um efeito interno compara o estado anterior com o atual e
// só mexe no histórico numa transição real (Seção 8 do pedido), o que também
// elimina por construção o risco de esquecer um pushLevel em algum modal novo
// no futuro.
interface BackNavState {
  maternaia: true;
  depth: number;
  kinds: BackLevelKind[];
}

interface SuppressTarget {
  active: boolean;
  targetState: BackNavState | null;
}

interface UseBackNavigationOptions extends BackNavFlags {
  onPopOverlay: () => void;
  onPopTab: () => void;
  onPopDrill: () => void;
}

function stateFor(flags: BackNavFlags): BackNavState {
  return { maternaia: true, depth: depthOf(flags), kinds: activeKinds(flags) };
}

export function useBackNavigation({ hasDrill, hasTab, hasOverlay, onPopOverlay, onPopTab, onPopDrill }: UseBackNavigationOptions) {
  const flags: BackNavFlags = { hasDrill, hasTab, hasOverlay };

  const prevFlagsRef = useRef<BackNavFlags>({ hasDrill: false, hasTab: false, hasOverlay: false });
  // Marca que o próximo popstate é consequência de UMA CHAMADA NOSSA
  // (history.back()/go()), não de o usuário ter apertado Voltar de verdade —
  // sem isso, reduzir a profundidade programaticamente (ex.: resetToRest, ou
  // colapsar depois de um modal fechado por um botão "Cancelar" comum)
  // disparia o mesmo listener de popstate e tentaria "resolver mais um
  // nível" por engano — o loop que a Seção 3 do pedido pede pra evitar.
  const suppressRef = useRef<SuppressTarget>({ active: false, targetState: null });
  // Marca que a redução de profundidade observada no próximo efeito já foi
  // consumida por um Back de verdade (popstate real) — o histórico do
  // navegador já se moveu sozinho nesse caso, então o efeito de sincronização
  // não deve chamar history.back()/go() de novo.
  const poppedByBackRef = useRef(false);
  const callbacksRef = useRef({ onPopOverlay, onPopTab, onPopDrill });
  callbacksRef.current = { onPopOverlay, onPopTab, onPopDrill };

  // Sentinel (Seção 2) — roda uma vez, ao montar. Sempre carimba a entrada
  // ATUAL (replaceState, nunca pushState) como nosso "depth 0" limpo — nunca
  // assume que o history.state de uma entrada anterior (ex.: sobrevivente de
  // um reload em cima de um modal aberto) ainda é confiável. Não soma
  // nenhuma entrada nova ao histórico do navegador (não custa um Back extra
  // só por ter aberto o app) e não mexe em nada que já existia antes do
  // MaternaIA carregar.
  useEffect(() => {
    window.history.replaceState(stateFor({ hasDrill: false, hasTab: false, hasOverlay: false }), '');
    prevFlagsRef.current = { hasDrill: false, hasTab: false, hasOverlay: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza o histórico com os 3 booleanos atuais — só age numa transição
  // real (Seção 8), nunca em todo re-render.
  useEffect(() => {
    const prevDepth = depthOf(prevFlagsRef.current);
    const nowDepth = depthOf(flags);
    prevFlagsRef.current = flags;

    if (nowDepth > prevDepth) {
      window.history.pushState(stateFor(flags), '');
    } else if (nowDepth < prevDepth) {
      if (poppedByBackRef.current) {
        poppedByBackRef.current = false;
        // Um popstate de verdade só consome 1 nível por vez; se ainda assim a
        // profundidade caiu mais que isso no mesmo tick, o histórico real já
        // não bate com o que calculamos — reetiqueta em vez de deixar
        // dessincronizado.
        if (prevDepth - nowDepth !== 1) {
          window.history.replaceState(stateFor(flags), '');
        }
      } else {
        // Nível fechado por uma ação normal da interface (botão "Cancelar"/X
        // do próprio modal, "Pacientes" no DoctorShell etc.), não pelo Back —
        // o histórico do navegador ainda "acha" que estamos mais fundo.
        // Colapsa a diferença exata, suprimindo o popstate que isso mesmo
        // dispara (senão tentaríamos "resolver" um nível que a interface já
        // resolveu sozinha).
        const delta = prevDepth - nowDepth;
        suppressRef.current = { active: true, targetState: stateFor(flags) };
        window.history.go(-delta);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDrill, hasTab, hasOverlay]);

  // popstate (Seção 3) — Back (ou Forward) de verdade, do sistema/navegador.
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (suppressRef.current.active) {
        const target = suppressRef.current.targetState!;
        suppressRef.current = { active: false, targetState: null };
        window.history.replaceState(target, '');
        return;
      }

      const state = event.state as BackNavState | null;
      if (!state?.maternaia) return; // entrada de fora do MaternaIA — deixa o navegador seguir normal

      const currentDepth = depthOf(flags);

      if (state.depth < currentDepth) {
        // Back: resolve exatamente o nível de prioridade mais alta presente.
        const kind = nextPopKind(flags);
        if (kind) poppedByBackRef.current = true;
        if (kind === 'overlay') callbacksRef.current.onPopOverlay();
        else if (kind === 'tab') callbacksRef.current.onPopTab();
        else if (kind === 'drill') callbacksRef.current.onPopDrill();
      } else if (state.depth > currentDepth) {
        // Forward pra uma entrada mais funda que a atual (Seção 15). Este
        // hook não guarda QUAL modal/aba estava aberto ali — só reabrir algo
        // genérico seria adivinhar. Em vez de arriscar reconstruir errado (ou
        // deixar o histórico "achando" uma profundidade que o app não tem),
        // reetiqueta essa entrada pra bater com o estado real — comportamento
        // seguro e documentado, mesmo sem restaurar a tela exata.
        window.history.replaceState(stateFor(flags), '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDrill, hasTab, hasOverlay]);

  // Autenticação (Seção 9) — login/logout/Trocar usuário chamam isto pra
  // zerar a navegação em uma tacada só, independente de quantos níveis
  // estavam ativos. Usa history.go(-N) (não N chamadas de back()) porque um
  // logout pode acontecer com os 3 níveis ativos ao mesmo tempo — colapsar um
  // de cada vez exigiria aguardar cada popstate assíncrono antes do próximo,
  // e deixaria uma janela em que Back ainda alcançaria uma entrada da
  // identidade anterior.
  const resetToRest = () => {
    const dropDepth = depthOf(flags);
    prevFlagsRef.current = { hasDrill: false, hasTab: false, hasOverlay: false };
    if (dropDepth > 0) {
      suppressRef.current = { active: true, targetState: stateFor({ hasDrill: false, hasTab: false, hasOverlay: false }) };
      window.history.go(-dropDepth);
    } else {
      window.history.replaceState(stateFor({ hasDrill: false, hasTab: false, hasOverlay: false }), '');
    }
  };

  return { resetToRest };
}
