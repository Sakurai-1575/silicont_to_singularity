import { Modal } from "./Modal";
import { GameButton } from "./GameButton";

/**
 * Shared confirmation dialog for destructive/irreversible actions (追加小修正
 * spec sections 2/3: training cancellation and completed-model deletion both
 * explicitly require a confirmation dialog "誤操作防止のため"). Built on the
 * existing Modal shell rather than a new overlay component, so it inherits
 * the same Escape/backdrop-click/close-button behavior as every other modal
 * in the game.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel} widthClassName="max-w-sm" closeLabel={cancelLabel}>
      <div className="flex flex-col gap-3">
        <p className="text-xs leading-relaxed text-ink-dim">{message}</p>
        <div className="flex justify-end gap-2">
          <GameButton variant="ghost" size="sm" onClick={onCancel}>
            {cancelLabel}
          </GameButton>
          <GameButton variant="danger" size="sm" onClick={onConfirm}>
            {confirmLabel}
          </GameButton>
        </div>
      </div>
    </Modal>
  );
}
