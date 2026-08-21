// HOTFIX — causa raiz do bug de persistência: o SDK do Firestore rejeita
// (lança erro síncrono) qualquer valor `undefined` em qualquer profundidade
// de um documento, inclusive dentro de arrays/objetos aninhados como
// consultasEvolucao[i].diagnostico. Campos TypeScript opcionais (ex:
// `diagnostico?: DiagnosticoRegistrado`) viram, em JS, uma propriedade
// PRÓPRIA com valor `undefined` quando espalhados via
// `{ ...obj, diagnostico: newConsulta.diagnostico }` sempre que
// `newConsulta.diagnostico` for undefined (ex: atendimento salvo sem CID
// selecionado, o caso mais comum) — isso é diferente de omitir a chave.
//
// Essa propriedade lança dentro de usePatients.ts::saveToFirestore, na
// própria construção do array `writes` (antes de `logs`/`deletes` sequer
// rodarem) — como o erro é síncrono e não fica dentro de uma Promise
// individual, o `try/catch` externo captura e loga silenciosamente
// (console.error), sem escrever NADA no Firestore. Como `setPatients(...)`
// já tinha rodado de forma otimista antes do try/catch, a tela parecia
// salva até o próximo reload puxar o documento antigo do Firestore.
//
// Corrige na fonte (o próprio limite de escrita), não espalhando `?? null`
// nem "texto vazio" pelos pontos que constroem ConsultaEvolucao/
// SolicitacaoClinica — remove a CHAVE inteira quando o valor é undefined,
// recursivamente. Isso também é o comportamento certo pra "apagar um campo
// já salvo" (ex: limpar o CID de um atendimento em edição): como o array
// inteiro é reenviado como um único valor de campo (Firestore não faz merge
// profundo dentro de arrays), a ausência da chave no objeto que enviamos já
// resulta na ausência real do campo no documento salvo.
export function limparParaFirestore<T>(valor: T): T {
  if (Array.isArray(valor)) {
    return valor.map((item) => limparParaFirestore(item)) as unknown as T;
  }
  if (valor !== null && typeof valor === 'object' && !(valor instanceof Date)) {
    const limpo: Record<string, unknown> = {};
    for (const [chave, v] of Object.entries(valor as Record<string, unknown>)) {
      if (v === undefined) continue;
      limpo[chave] = limparParaFirestore(v);
    }
    return limpo as T;
  }
  return valor;
}
