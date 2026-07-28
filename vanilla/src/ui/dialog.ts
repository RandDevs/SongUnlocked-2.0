/**
 * Modal built on the native <dialog> element, so focus trapping, Escape to
 * close, and the backdrop come from the platform rather than from us.
 *
 * The title bar and the Cancel/Confirm footer are pinned; only the body
 * scrolls. A long chord sheet in the song form used to push Save below the
 * fold, which made "just the title and artist" — the most common way anyone
 * adds a song — require a scroll to finish. The commit action should never be
 * further away than the work is.
 */

import { h } from "../dom.js";
import { icon } from "../icons.js";

export interface DialogOptions {
  title: string;
  body: Node;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm?: () => boolean | void | Promise<boolean | void>;
  onClose?: () => void;
}

export function openDialog(options: DialogOptions): HTMLDialogElement {
  const dialog = h("dialog", { class: "sheetdialog" }) as HTMLDialogElement;

  const close = () => {
    dialog.close();
  };

  const confirmButton = options.confirmLabel
    ? h(
        "button",
        {
          class: `btn ${options.destructive ? "btn--danger" : "btn--primary"}`,
          type: "submit",
        },
        options.confirmLabel,
      )
    : null;

  const form = h(
    "form",
    {
      method: "dialog",
      // Native validation bubbles would block submit before our own handler
      // runs, so errors would never reach the toast. One error path, not two.
      novalidate: true,
      async onsubmit(event: Event) {
        event.preventDefault();
        if (!options.onConfirm) {
          close();
          return;
        }

        if (confirmButton) {
          (confirmButton as HTMLButtonElement).disabled = true;
        }

        try {
          const result = await options.onConfirm();
          if (result !== false) close();
        } finally {
          if (confirmButton) {
            (confirmButton as HTMLButtonElement).disabled = false;
          }
        }
      },
    },
    h(
      "div",
      { class: "sheetdialog__head" },
      h("h2", { class: "sheetdialog__title", text: options.title }),
      h(
        "button",
        {
          class: "btn btn--ghost btn--icon",
          type: "button",
          "aria-label": "Close",
          onclick: close,
        },
        icon("close"),
      ),
    ),
    h("div", { class: "sheetdialog__body" }, options.body),
    h(
      "div",
      { class: "sheetdialog__foot" },
      h(
        "button",
        { class: "btn btn--ghost", type: "button", onclick: close },
        options.cancelLabel || "Cancel",
      ),
      confirmButton,
    ),
  );

  dialog.appendChild(form);
  dialog.addEventListener("close", () => {
    // Custom controls inside the body may hold document-level listeners, so
    // they get a chance to detach before the node disappears.
    options.onClose?.();
    dialog.remove();
  });
  document.body.appendChild(dialog);
  dialog.showModal();

  const firstField = dialog.querySelector(
    "input:not([type=hidden]), select, textarea",
  );
  if (firstField instanceof HTMLElement) firstField.focus();

  return dialog;
}

export function confirmDialog(options: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
}): HTMLDialogElement {
  return openDialog({
    title: options.title,
    body: h("p", { class: "hint", text: options.message }),
    confirmLabel: options.confirmLabel,
    destructive: true,
    onConfirm: options.onConfirm,
  });
}
