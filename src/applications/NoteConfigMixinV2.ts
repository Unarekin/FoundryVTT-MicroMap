import { logError } from "logging";
import { NoteFlags } from "../types";
import { getNoteFlags } from "utils";

export function NoteConfigV2Mixin(Base: typeof foundry.applications.sheets.NoteConfig) {
  class Mixed extends Base {

    async _onRender(context: foundry.applications.sheets.NoteConfig.RenderContext, options: foundry.applications.api.ApplicationV2.RenderOptions) {
      await super._onRender(context, options);

      const flags = getNoteFlags(this.document);

      const content = await renderTemplate(`modules/${__MODULE_ID__}/templates/NoteConfig.hbs`, {
        note: this.document,
        flags,
        idPrefix: this.document.uuid.replaceAll(".", "-")
      });

      const section = this.element.querySelector(`fieldset[data-role="micro-map"]`);
      if (section instanceof HTMLElement) section.remove();

      const container = this.element.querySelector(`[data-application-part="body"]`);
      if (container instanceof HTMLElement) container.innerHTML += content;
    }

    _processFormData(e: SubmitEvent | null, form: HTMLFormElement, formData: FormDataExtended) {
      const parsed = super._processFormData(e, form, formData);

      const data = (foundry.utils.expandObject(formData.object) as Record<string, unknown>).microMap as NoteFlags;
      const update = {
        flags: {
          [__MODULE_ID__]: data
        }
      };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.document.update(update as any)
        .catch(logError);

      return parsed;
    }

    // constructor(options: foundry.applications.sheets.NoteConfig.Configuration) {
    //   super(options);
    // }
  }

  return Mixed;
}