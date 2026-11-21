import { z } from "zod";

/**
 * Schemas do endpoint `POST /calculadora/observabilidade/regime-geral` do
 * motor oficial (calculadora-rtc-regime-regular, tag 1.7.2, commit
 * f1eebd7ce3157423b1a6aaca7dc1d6c3395452c4).
 *
 * Há dois níveis, de propósito:
 *
 * 1. `envelopeOperacaoSchema` é o que o BFF exige antes de encaminhar: um
 *    objeto JSON com `itens` não vazio. Todo o resto é validado pelo MOTOR,
 *    que é a fonte da verdade. O endpoint de observabilidade devolve erros de
 *    campo por item (HTTP 200 com `estadoItem`), e barrar isso antes quebraria
 *    a paridade com o motor (ver tests/contract/paridade-upstream.test.ts).
 *    O corpo é encaminhado como texto original, sem ser reescrito.
 *
 * 2. `operacaoSchema` espelha as restrições estruturais do contrato
 *    (Bean Validation das classes de entrada e o OpenAPI do motor). Ele é
 *    usado na interface, como apoio antes de enviar, e no formulário guiado.
 *    Não contém regra tributária. Campos opcionais aceitam `null`, como o
 *    Jackson do motor aceita.
 */

/** Exigido pelo BFF antes de encaminhar ao motor. */
export const envelopeOperacaoSchema = z.looseObject({
  itens: z.array(z.unknown()).min(1, "Informe ao menos um item"),
});

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
const opcional = <T extends z.ZodType>(s: T) => s.nullish();

export const aliquotasNominaisImpostoSeletivoSchema = z.looseObject({
  adValorem: opcional(percentual),
  adRem: opcional(z.number().finite().nonnegative()),
});

export const aliquotasNominaisSchema = z.looseObject({
  cbs: opcional(percentual),
  ibsEstadual: opcional(percentual),
  ibsMunicipal: opcional(percentual),
  impostoSeletivo: opcional(aliquotasNominaisImpostoSeletivoSchema),
});

export const impostoSeletivoSchema = z.looseObject({
  cst: digitos(3),
  cClassTrib: digitos(6),
  baseCalculo: decimal(13, 2),
  quantidade: opcional(decimal(11, 4)),
  unidade: opcional(z.string()),
  impostoInformado: opcional(decimal(13, 2)),
});

export const tributacaoRegularSchema = z.looseObject({
  cst: digitos(3),
  cClassTrib: digitos(6),
});

/** Componentes da base de cálculo (ComponentesBaseCalculoInput), todos opcionais e >= 0. */
export const COMPONENTES_BC = [
  "vProd",
  "vFrete",
  "vSeg",
  "vOutro",
  "vII",
  "vIS",
  "vDesc",
  "vPIS",
  "vCOFINS",
  "vICMS",
  "vICMSUFDest",
  "vFCP",
  "vFCPUFDest",
  "vICMSMono",
  "vISSQN",
] as const;

export const componentesBaseCalculoSchema = z.looseObject(
  Object.fromEntries(COMPONENTES_BC.map((c) => [c, opcional(decimal(13, 2))])) as Record<
    (typeof COMPONENTES_BC)[number],
    z.ZodOptional<z.ZodNullable<ReturnType<typeof decimal>>>
  >,
);

export const compraGovernamentalSchema = z.looseObject({
  tpEnteGov: z.number().int(),
  tpOperGov: opcional(z.number().int()),
});

export const itemOperacaoSchema = z.looseObject({
  numero: z.number().int().min(1).max(9_999_999),
  ncm: opcional(z.string()),
  nbs: opcional(z.string()),
  cst: digitos(3),
  cClassTrib: digitos(6),
  baseCalculo: opcional(decimal(13, 2)),
  // Upstream: @Digits(11, 4) sem @PositiveOrZero.
  quantidade: opcional(z.number().finite()),
  unidade: opcional(z.string()),
  impostoSeletivo: opcional(impostoSeletivoSchema),
  tributacaoRegular: opcional(tributacaoRegularSchema),
  gComponentesBC: opcional(componentesBaseCalculoSchema),
  aliquotasNominais: opcional(aliquotasNominaisSchema),
});

const dataHora = z.iso.datetime({ offset: true, error: "Use data e hora ISO 8601, ex.: 2027-03-10T10:00:00-03:00" });

export const operacaoSchema = z.looseObject({
  id: z.string().min(1, "Obrigatório"),
  versao: z.string().min(1, "Obrigatório"),
  /** Opcional no contrato; o motor exige ela ou `dataHoraEmissao` (obsoleto). */
  dhFatoGerador: opcional(dataHora),
  /** Obsoleto no motor, ainda aceito. */
  dataHoraEmissao: opcional(dataHora),
  municipio: z.number().int().min(0).max(9_999_999),
  uf: opcional(z.string().length(2, "Use a sigla da UF com 2 letras")),
  tpDoc: opcional(z.number().int().min(1).max(999)),
  gCompraGov: opcional(compraGovernamentalSchema),
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
 * Validação mínima da resposta da observabilidade: só o envelope. O corpo é
 * devolvido como veio do motor (o resultado do parse é descartado).
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
