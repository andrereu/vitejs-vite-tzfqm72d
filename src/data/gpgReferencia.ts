// UX-04 — referência de Ganho de Peso Gestacional (GPG) fornecida pela Dra.
// Priscila: as 4 categorias de IMC pré-gestacional que ela já usa na
// Caderneta impressa da clínica. Fonte de verdade desta fase — não é IOM,
// não é a curva de Atalah, não foi buscada na internet. Os limites de IMC,
// o ganho total recomendado até 40 semanas e os rótulos dos percentis vêm
// diretamente das 4 tabelas fornecidas (a quantidade de percentis por
// categoria é diferente de propósito — baixo peso/sobrepeso/obesidade têm 5,
// eutrofia tem 4 — e isso não é pra ser uniformizado).
//
// As curvas semana a semana (gpgCurvas.ts) vêm da digitalização manual das 4
// imagens dos gráficos oficiais que a Dra. enviou — ver o cabeçalho daquele
// arquivo pra a metodologia e o nível de confiança de cada ponto.
export type CategoriaGPG = 'baixo_peso' | 'eutrofia' | 'sobrepeso' | 'obesidade';

export interface FaixaGPG {
  categoria: CategoriaGPG;
  label: string;
  imcMin: number;
  imcMax: number | null; // null = sem teto superior (obesidade)
  ganhoTotal: { min: number; max: number }; // kg, até 40 semanas
  percentis: string[]; // rótulos exatamente como fornecidos pela Dra., sem uniformizar
  /** Cor de categoria — não usa a semântica de sucesso/pendência/urgência já usada no resto do app (seção 9 da fase). */
  corBadge: string;
  /** Mesma cor, em hex, pro SVG do gráfico (Tailwind bg-* não é utilizável dentro de <svg fill>/<stroke>). */
  corHex: string;
}

export const FAIXAS_GPG: FaixaGPG[] = [
  {
    categoria: 'baixo_peso',
    label: 'Baixo peso',
    imcMin: 0,
    imcMax: 18.5,
    ganhoTotal: { min: 9.7, max: 12.2 },
    percentis: ['P10', 'P18', 'P34', 'P50', 'P90'],
    corBadge: 'bg-sky-600',
    corHex: '#0284c7'
  },
  {
    categoria: 'eutrofia',
    label: 'Eutrofia',
    imcMin: 18.5,
    imcMax: 25.0,
    ganhoTotal: { min: 8, max: 12 },
    percentis: ['P10', 'P34', 'P50', 'P90'],
    corBadge: 'bg-indigo-600',
    corHex: '#4f46e5'
  },
  {
    categoria: 'sobrepeso',
    label: 'Sobrepeso',
    imcMin: 25.0,
    imcMax: 30.0,
    ganhoTotal: { min: 7, max: 9 },
    percentis: ['P10', 'P18', 'P27', 'P50', 'P90'],
    corBadge: 'bg-violet-600',
    corHex: '#7c3aed'
  },
  {
    categoria: 'obesidade',
    label: 'Obesidade',
    imcMin: 30.0,
    imcMax: null,
    ganhoTotal: { min: 5, max: 7.2 },
    percentis: ['P10', 'P27', 'P38', 'P50', 'P90'],
    corBadge: 'bg-stone-600',
    corHex: '#57534e'
  }
];

// Mesmos limites de IMC das 4 tabelas fornecidas — < 18,5 / 18,5 a 24,9 /
// 25,0 a 29,9 / ≥ 30,0. Um único ponto de classificação (antes duplicado
// inline em App.tsx::bmiInfo).
export function classificarPorIMC(imc: number): FaixaGPG {
  if (imc < 18.5) return FAIXAS_GPG[0];
  if (imc < 25.0) return FAIXAS_GPG[1];
  if (imc < 30.0) return FAIXAS_GPG[2];
  return FAIXAS_GPG[3];
}

// Peso/altura pré-gestacionais como o cadastro guarda (texto livre) — SEM o
// fallback de 60kg/1,65m que bmiInfo usava. Aqui a ausência ou um valor
// inválido precisa continuar sendo "não sei", não virar um IMC inventado
// que decidiria uma faixa de referência clínica errada.
export function calcularIMCInicial(pesoInicial: string | undefined, altura: string | undefined): number | null {
  const peso = parseFloat(pesoInicial || '');
  const alturaM = parseFloat(altura || '');
  if (!Number.isFinite(peso) || peso <= 0 || !Number.isFinite(alturaM) || alturaM <= 0) return null;
  return peso / (alturaM * alturaM);
}

export interface ReferenciaGPG {
  imcInicial: number | null;
  faixa: FaixaGPG | null;
}

// Combina as duas funções acima no formato que a tela usa — null em
// qualquer um dos dois campos significa "mostrar que a referência não está
// disponível", nunca uma faixa aproximada.
export function obterReferenciaGPG(pesoInicial: string | undefined, altura: string | undefined): ReferenciaGPG {
  const imcInicial = calcularIMCInicial(pesoInicial, altura);
  return { imcInicial, faixa: imcInicial === null ? null : classificarPorIMC(imcInicial) };
}
