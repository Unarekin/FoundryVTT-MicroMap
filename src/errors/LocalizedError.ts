import { localize } from "utils";

export class LocalizedError extends Error {
  constructor(message?: string, subs?: Record<string, string>) {
    if (message) super(localize(`MINIMAP.ERRORS.${message}`, subs ?? {}));
    else super();
  }
}
