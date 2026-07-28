import React, { useEffect, useRef, useCallback } from "react";
import { Icon } from "./Icon.js";

export interface DialogProps {
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm?: () => boolean | void | Promise<boolean | void>;
  onClose: () => void;
}

export function Dialog(props: DialogProps) {
  const {
    title,
    children,
    confirmLabel,
    cancelLabel,
    destructive,
    onConfirm,
    onClose,
  } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);

  useEffect(() => {
    closingRef.current = false;
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.hasAttribute("open")) {
      dialog.showModal();
    }

    const firstField = dialog.querySelector<HTMLElement>(
      "input:not([type=hidden]), select, textarea",
    );
    if (firstField) firstField.focus();
  }, []);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    onClose();
  }, [onClose]);

  const handleCancel = (e: React.SyntheticEvent) => {
    // Intercept native cancel event on dialog (Escape)
    e.preventDefault();
    handleClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onConfirm) {
      handleClose();
      return;
    }

    if (confirmButtonRef.current) {
      confirmButtonRef.current.disabled = true;
    }

    try {
      const result = await onConfirm();
      if (result !== false) {
        handleClose();
      }
    } finally {
      if (confirmButtonRef.current) {
        confirmButtonRef.current.disabled = false;
      }
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="sheetdialog"
      onCancel={handleCancel}
      onClose={handleClose}
    >
      <form noValidate onSubmit={handleSubmit}>
        <div className="sheetdialog__head">
          <h2 className="sheetdialog__title">{title}</h2>
          <button
            className="btn btn--ghost btn--icon"
            type="button"
            aria-label="Close"
            onClick={handleClose}
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="sheetdialog__body">{children}</div>

        <div className="sheetdialog__foot">
          <button
            className="btn btn--ghost"
            type="button"
            onClick={handleClose}
          >
            {cancelLabel || "Cancel"}
          </button>
          {confirmLabel ? (
            <button
              ref={confirmButtonRef}
              className={`btn ${destructive ? "btn--danger" : "btn--primary"}`}
              type="submit"
            >
              {confirmLabel}
            </button>
          ) : null}
        </div>
      </form>
    </dialog>
  );
}

export function ConfirmDialog(props: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  return (
    <Dialog
      title={props.title}
      confirmLabel={props.confirmLabel}
      destructive={true}
      onConfirm={props.onConfirm}
      onClose={props.onClose}
    >
      <p className="hint">{props.message}</p>
    </Dialog>
  );
}
