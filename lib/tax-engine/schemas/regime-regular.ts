import { z } from "zod";

/**
 * Schemas de ENTRADA do endpoint `POST /calculadora/regime-geral` (e da
 * variante `/calculadora/observabilidade/regime-geral`) do motor oficial.
 *
 * Fonte: classes `OperacaoInput`, `ItemOperacaoInput`, `ImpostoSeletivoInput`,
 * `AliquotasNominaisInput` e `AliquotasNominaisImpostoSeletivo` em
 * https://github.com/ReceitaFederal/calculadora-rtc-regime-regular
 * (tag 1.7.2, commit f1eebd7ce3157423b1a6aaca7dc1d6c3395452c4).
 *
 * Estes schemas reproduzem APENAS as restrições estruturais declaradas por
 * Bean Validation no upstream (obrigatoriedade, tamanho, dígitos), para dar
 * retorno rápido no formulário. Eles não contêm nenhuma regra tributária:
 * regras condicionais (ex.: `aliquotasNominais` obrigatório a partir de 2027,
 * vínculo NCM × cClassTrib) são validadas pelo motor, que é a fonte da verdade.
 * Grupos ainda não cobertos (`tributacaoRegular`, `gComponentesBC`,
 * `gCompraGov`) são aceitos e repassados sem validação local.
 */

/** Equivalente a `@Digits(integer, fraction)` + `@PositiveOrZero`. */
function decimal(integer: number, fraction: number) {
  return z
    .number()
    .finite()
    .nonnegative("Deve ser zero ou positivo")
    .refine((value) => {
      const [intPart, fracPart = ""] = Math.abs(value).toString().split(".");
      return intPart.replace(/^0+(?=\d)/, "").length <= integer && fracPart.length <= fraction;
    }, `Máximo de ${integer} dígitos inteiros e ${fraction} decimais`);
}

const digitos = (tamanho: number) =>
  z
    .string()
    .regex(/^\d+$/, "Informar somente dígitos")
    .length(tamanho, `Deve ter ${tamanho} dígitos`);

const percentual = decimal(3, 4).max(100, "Máximo de 100");

export const aliquotasNominaisImpostoSeletivoSchema = z.object({
  adValorem: percentual.optional(),
  adRem: z.number().finite().nonnegative().optional(),
});

export const aliquotasNominaisSchema = z.object({
  cbs: percentual.optional(),
  ibsEstadual: percentual.optional(),
  ibsMunicipal: percentual.optional(),
  impostoSeletivo: aliquotasNominaisImpostoSeletivoSchema.optional(),
});

export const impostoSeletivoSchema = z.object({
  cst: digitos(3),
  cClassTrib: digitos(6),
  baseCalculo: decimal(13, 2),
  quantidade: decimal(11, 4).optional(),
  unidade: z.string().optional(),
  impostoInformado: decimal(13, 2).optional(),
});

export const itemOperacaoSchema = z.looseObject({
  numero: z.number().int().min(1).max(9_999_999),
  ncm: z.string().optional(),
  nbs: z.string().optional(),
  cst: digitos(3),
  cClassTrib: digitos(6),
  baseCalculo: decimal(13, 2).optional(),
  // Upstream: @Digits(11, 4) sem @PositiveOrZero.
  quantidade: z.number().finite().optional(),
  unidade: z.string().optional(),
  impostoSeletivo: impostoSeletivoSchema.optional(),
  aliquotasNominais: aliquotasNominaisSchema.optional(),
});

export const operacaoSchema = z.looseObject({
  id: z.string().min(1, "Obrigatório"),
  versao: z.string().min(1, "Obrigatório"),
  /** ISO 8601 com offset, ex.: 2027-03-10T10:00:00-03:00 */
  dhFatoGerador: z.iso.datetime({ offset: true }),
  municipio: z.number().int().min(0).max(9_999_999),
  uf: z.string().length(2, "Use a sigla da UF com 2 letras").optional(),
  tpDoc: z.number().int().min(1).max(999).optional(),
  itens: z.array(itemOperacaoSchema).min(1, "Informe ao menos um item"),
});

export type OperacaoInput = z.infer<typeof operacaoSchema>;
export type ItemOperacaoInput = z.infer<typeof itemOperacaoSchema>;

/**
 * Estados de item documentados em docs/exemplos.md do upstream para a
 * resposta da observabilidade.
 */
export const ESTADOS_ITEM = [
  "CALCULADO",
  "CALCULO_SIMULADO",
  "INCONSISTENCIA_ENTRADA",
  "NAO_IMPLEMENTADO",
  "FALHA_TECNICA",
] as const;

/** Resposta de `GET /calculadora/dados-abertos/versao` (VersaoOutput). */
export const versaoSchema = z.looseObject({
  versaoApp: z.string().optional(),
  descricaoVersaoApp: z.string().optional(),
  versaoDb: z.string().optional(),
  descricaoVersaoDb: z.string().optional(),
  dataVersaoDb: z.string().optional(),
  ambiente: z.string().optional(),
});

/**
 * Validação mínima da resposta da observabilidade: só o envelope. O conteúdo
 * de cada objeto é preservado integralmente para exibição/inspeção.
 */
export const observabilidadeRespostaSchema = z.looseObject({
  objetos: z.array(
    z.looseObject({
      nObj: z.number(),
      estadoItem: z.string(),
    }),
  ),
  total: z.unknown().optional(),
});

export type ObservabilidadeResposta = z.infer<typeof observabilidadeRespostaSchema>;
