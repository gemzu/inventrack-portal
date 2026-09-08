/**
 * How an inventory item names itself.
 *
 * Both the inventory table and the box detail were printing the same string
 * twice: one took modelId as the title and barcode as the subtitle, and for
 * anything created by scanning, the app sets model_id to the barcode. So a row
 * read "019800702083" over "019800702083", which tells you nothing.
 *
 * One helper so the two screens cannot drift again. The subtitle is only ever
 * shown when it adds something the title did not already say.
 */

export type Identifiable = {
  displayName?: string | null;
  modelId?: string | null;
  barcode?: string | null;
};

export type Identity = {
  title: string;
  /** Empty when the code would only repeat the title. */
  subtitle: string;
  /** True when the item has no human name, only codes. */
  unnamed: boolean;
};

export function itemIdentity(item: Identifiable): Identity {
  const name = item.displayName?.trim() || "";
  const model = item.modelId?.trim() || "";
  const code = item.barcode?.trim() || "";

  /* A real name wins. Otherwise the model, but only when it is not just the
     barcode again. Otherwise the barcode itself. */
  const title = name || (model && model !== code ? model : "") || code || "Untitled item";

  const candidate = code && code !== title ? code : model && model !== title ? model : "";

  return { title, subtitle: candidate, unnamed: !name };
}
