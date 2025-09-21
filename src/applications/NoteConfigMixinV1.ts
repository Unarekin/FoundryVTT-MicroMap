import { logError } from "logging";
import { getNoteFlags } from "utils";

export function NoteConfigV1Mixin(Base: typeof NoteConfig) {
  return class NoteConfigV1 extends Base {

    async _onSubmit(event: Event, options?: FormApplication.OnSubmitOptions): Promise<Partial<any>> {
      const submittedData = await super._onSubmit(event, options);

      if (this.document.id) {
        const data = foundry.utils.expandObject(submittedData) as Record<string, unknown>;
        if (data.microMap) {
          const update = {
            flags: {
              [__MODULE_ID__]: data.microMap
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          this.document.update(update as any).catch(logError);
        }
      }


      return submittedData;
    }

    async _renderInner(data: ReturnType<this["getData"]>): Promise<JQuery<HTMLElement>> {

      const html = await super._renderInner(data);
      if (!this.document.id) return html;

      const flags = getNoteFlags(this.document);

      const content = await renderTemplate(`modules/${__MODULE_ID__}/templates/NoteConfig.hbs`, {
        note: this.document,
        flags,
        idPrefix: this.document?.uuid ? this.document.uuid.replaceAll(".", "-") : ""
      });

      const div = html.find("div.form-group").last();
      div.after(content);

      return html;
    }
  }
}