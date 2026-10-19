import { useOperationsHistory } from "../context/OperationsHistoryContext";

export function UndoToast() {
  const history = useOperationsHistory();

  if (!history?.toast?.visible) {
    return null;
  }

  return (
    <div className="m-toast" role="status" aria-live="polite">
      <span>{history.toast.message}</span>
      {history.toast.action && (
        <button type="button" className="m-toast-action" onClick={history.toast.action.onClick}>
          {history.toast.action.label}
        </button>
      )}
    </div>
  );
}
