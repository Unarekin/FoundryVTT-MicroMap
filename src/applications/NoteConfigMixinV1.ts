import { logError } from "logging";
import { NoteFlags } from "types";
import { getNoteFlags } from "utils";

export function NoteConfigV1Mixin(Base: typeof NoteConfig) {
  return class NoteConfigV1 extends Base {

    async _onSubmit(event: Event, options?: FormApplication.OnSubmitOptions): Promise<Partial<any>> {
      const form = this.element.find("form")[0];
      if (form instanceof HTMLFormElement) {
        const data = (foundry.utils.expandObject((new FormDataExtended(form)).object) as Record<string, unknown>).microMap as NoteFlags;
        const update = {
          flags: {
            [__MODULE_ID__]: data
          }
        };

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.document.update(update as any).catch(logError);
      }

      return super._onSubmit(event, options);
    }

    async _renderInner(data: ReturnType<this["getData"]>): Promise<JQuery<HTMLElement>> {
      const html = await super._renderInner(data);

      const flags = getNoteFlags(this.document);

      const content = await renderTemplate(`modules/${__MODULE_ID__}/templates/NoteConfig.hbs`, {
        note: this.document,
        flags,
        idPrefix: this.document.uuid.replaceAll(".", "-")
      });

      const div = html.find("div.form-group").last();
      div.after(content);

      return html;
    }
  }
}