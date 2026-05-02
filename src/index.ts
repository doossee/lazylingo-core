export type {
  CefrLevel,
  Example,
  Flashcard,
  Grade,
  LookupResult,
  PartOfSpeech,
  PosSection,
  Sense,
  SRSState,
  VaultConfig,
} from "./types.js";

export { initialState, schedule } from "./srs.js";
export { fromMarkdown, toMarkdown } from "./markdown.js";
export { lookup } from "./dictionary/lookup.js";
export { fetchFreeDict, NotFoundError } from "./dictionary/free-dict.js";
export { translate } from "./dictionary/mymemory.js";
export { pollForToken, requestDeviceCode } from "./vault/github-auth.js";
export type { DeviceCodeRequest, SleepFn } from "./vault/github-auth.js";
export { Vault } from "./vault/sync.js";
export { ConflictError } from "./vault/github-api.js";
