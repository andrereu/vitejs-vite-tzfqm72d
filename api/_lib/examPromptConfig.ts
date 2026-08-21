// UX-05.2 — monta o trecho do prompt do Gemini que carrega a preferência de
// leitura da médica por modalidade (doctors/{doctorId}/config/exames). Função
// pura de propósito: não toca Firestore nem rede, só decide QUAL modalidade
// usar e COMO concatenar o texto — assim dá pra testar sem paciente, sem
// Admin SDK e sem chave do Gemini (api/analyze-exam.ts busca o documento e
// só chama isto depois).
export type ModalidadeExame = 'ecografia' | 'laboratorial' | 'outros';

export interface InstrucoesPorModalidade {
  ecografia?: string;
  laboratorial?: string;
  outros?: string;
}

export interface ExameAIConfig {
  instrucoesPorModalidade?: InstrucoesPorModalidade;
}

// Mesmo agrupamento usado na Central de Laudos e Imagens: Ecografia e
// Laboratorial têm campo próprio; qualquer outra categoria (Outro, e futuras
// como Tomografia/Ressonância enquanto não tiverem categoria própria de
// upload) cai em "outros" — de propósito, pra não exigir uma caixa de texto
// nova a cada nova modalidade de imagem.
export function modalidadeDoExame(examCategory: string): ModalidadeExame {
  if (examCategory === 'Ecografia') return 'ecografia';
  if (examCategory === 'Laboratorial') return 'laboratorial';
  return 'outros';
}

// Sem preferência configurada (documento ausente, ou modalidade sem texto
// salvo) devolve string vazia — o prompt geral fica idêntico ao de antes da
// UX-05.2, sem nenhuma mudança de comportamento pra quem não configurou nada.
export function montarBlocoPreferenciaModalidade(
  config: ExameAIConfig | null | undefined,
  examCategory: string
): string {
  const modalidade = modalidadeDoExame(examCategory);
  const instrucao = config?.instrucoesPorModalidade?.[modalidade]?.trim();
  if (!instrucao) return '';
  return `\n\nPREFERÊNCIA DA MÉDICA PARA ESTA MODALIDADE (informada nas configurações do consultório — é orientação, não substitui as regras acima):\n${instrucao}\n`;
}
