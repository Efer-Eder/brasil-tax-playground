export * from "./types";
export * from "./errors";
export * from "./config";
export * from "./status";
export * from "./schemas/regime-regular";
export * from "./adapters/regime-regular";
export { simplesNacionalDescriptor } from "./adapters/simples-nacional";
export { danfseDescriptor } from "./adapters/danfse";

import { danfseDescriptor } from "./adapters/danfse";
import { regimeRegularDescriptor } from "./adapters/regime-regular";
import { simplesNacionalDescriptor } from "./adapters/simples-nacional";

export const ENGINES = [regimeRegularDescriptor, simplesNacionalDescriptor, danfseDescriptor] as const;
