import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "../api";
import { invalidateTransactionCaches } from "../hooks/invalidateQueries";
import { formatNumber } from "../utils";
import { googleSheetsSync } from "../utils/googleSheetsSync";

export const OperationsHistoryContext = createContext(null);

const STORAGE_KEY = "fullcup_operations_history_v1";
const MAX_HISTORY = 50;

function loadStoredHistory() {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return { undoStack: [], redoStack: [] };
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { undoStack: [], redoStack: [] };
    const parsed = JSON.parse(raw);
    return {
      undoStack: Array.isArray(parsed?.undoStack)
        ? parsed.undoStack
            .filter((item) => item && typeof item === "object" && item.type)
            .slice(-MAX_HISTORY)
        : [],
      redoStack: Array.isArray(parsed?.redoStack)
        ? parsed.redoStack
            .filter((item) => item && typeof item === "object" && item.type)
            .slice(-MAX_HISTORY)
        : [],
    };
  } catch (err) {
    console.warn("Не удалось прочитать историю операций из localStorage:", err);
    return { undoStack: [], redoStack: [] };
  }
}

function saveStoredHistory(undoStack, redoStack) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const payload = JSON.stringify({
      undoStack: undoStack.slice(-MAX_HISTORY),
      redoStack: redoStack.slice(-MAX_HISTORY),
    });
    window.localStorage.setItem(STORAGE_KEY, payload);
  } catch (err) {
    console.warn("Не удалось сохранить историю операций в localStorage:", err);
  }
}

function updateAllOperationsCaches(queryClient, updater) {
  queryClient.setQueryData(["operations"], (old = []) => (Array.isArray(old) ? updater(old) : old));
  queryClient.setQueriesData({ queryKey: ["recent-operations"] }, (old = []) =>
    Array.isArray(old) ? updater(old) : old,
  );
}

export function OperationsHistoryProvider({ children }) {
  const queryClient = useQueryClient();
  const initialHistory = useMemo(() => loadStoredHistory(), []);
  const undoStackRef = useRef(initialHistory.undoStack);
  const redoStackRef = useRef(initialHistory.redoStack);
  const executionCountRef = useRef(0);
  const pendingPromiseRef = useRef(Promise.resolve());
  const [stackVersion, setStackVersion] = useState(0);

  const [toast, setToast] = useState({ visible: false, message: "", action: null });
  const toastTimeoutRef = useRef(null);
  const pendingDeletionRef = useRef(null);

  // Sync state between browser tabs via storage events
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed?.undoStack) && Array.isArray(parsed?.redoStack)) {
            undoStackRef.current = parsed.undoStack.slice(-MAX_HISTORY);
            redoStackRef.current = parsed.redoStack.slice(-MAX_HISTORY);
            setStackVersion((v) => v + 1);
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const showToast = useCallback((message, action = null, duration = 2500) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ visible: true, message, action });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ visible: false, message: "", action: null });
    }, duration);
  }, []);

  const commitPendingDeletion = useCallback(async () => {
    if (!pendingDeletionRef.current) return;
    const pending = pendingDeletionRef.current;
    pendingDeletionRef.current = null;
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ visible: false, message: "", action: null });
    setStackVersion((v) => v + 1);
    await pending.commit();
  }, []);

  const deleteWithUndo = useCallback(
    (itemsToDelete) => {
      const rawList = Array.isArray(itemsToDelete) ? itemsToDelete : [itemsToDelete];
      const items = rawList.filter(Boolean);
      if (items.length === 0) return;

      if (pendingDeletionRef.current) {
        commitPendingDeletion();
      }

      const itemIds = new Set(items.map((i) => i.id));
      updateAllOperationsCaches(queryClient, (old) => old.filter((op) => !itemIds.has(op.id)));

      const commit = async () => {
        try {
          if (items.length === 1) {
            await api.deleteOperation(items[0].id);
            googleSheetsSync.enqueueAction({
              type: "DELETE_TRANSACTION",
              id: items[0].id,
            });
          } else {
            await api.batchDeleteOperations(items.map((i) => i.id));
            googleSheetsSync.enqueueAction({
              type: "BATCH_DELETE_TRANSACTIONS",
              ids: items.map((i) => i.id),
            });
          }
        } catch (err) {
          console.error("Ошибка при удалении операции:", err);
          updateAllOperationsCaches(queryClient, (old) => {
            const existingIds = new Set(old.map((o) => o.id));
            const toAdd = items.filter((it) => !existingIds.has(it.id));
            return [...toAdd, ...old];
          });
          showToast("Ошибка при удалении");
        } finally {
          invalidateTransactionCaches(queryClient);
        }
      };

      const cancel = () => {
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }
        pendingDeletionRef.current = null;
        updateAllOperationsCaches(queryClient, (old) => {
          const existingIds = new Set(old.map((o) => o.id));
          const toAdd = items.filter((it) => !existingIds.has(it.id));
          return [...toAdd, ...old];
        });
        setToast({ visible: false, message: "", action: null });
        setStackVersion((v) => v + 1);
      };

      pendingDeletionRef.current = {
        items,
        commit,
        cancel,
      };

      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      setToast({
        visible: true,
        message: `Удалено: ${items.length}`,
        action: {
          label: "Отменить",
          onClick: cancel,
        },
      });
      setStackVersion((v) => v + 1);

      toastTimeoutRef.current = setTimeout(async () => {
        if (pendingDeletionRef.current) {
          const p = pendingDeletionRef.current;
          pendingDeletionRef.current = null;
          setToast({ visible: false, message: "", action: null });
          setStackVersion((v) => v + 1);
          await p.commit();
        }
      }, 6000);
    },
    [queryClient, commitPendingDeletion, showToast],
  );

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingDeletionRef.current) {
        pendingDeletionRef.current.commit();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (pendingDeletionRef.current) {
        pendingDeletionRef.current.commit();
      }
    };
  }, []);

  const recordAction = useCallback(
    (action) => {
      if (executionCountRef.current > 0) return;
      if (pendingDeletionRef.current) {
        commitPendingDeletion();
      }
      undoStackRef.current.push(action);
      if (undoStackRef.current.length > MAX_HISTORY) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
      saveStoredHistory(undoStackRef.current, redoStackRef.current);
      setStackVersion((v) => v + 1);
    },
    [commitPendingDeletion],
  );

  const undo = useCallback(() => {
    if (pendingDeletionRef.current) {
      pendingDeletionRef.current.cancel();
      return;
    }
    if (undoStackRef.current.length === 0) return;

    if (
      document.activeElement &&
      (document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA" ||
        document.activeElement.tagName === "SELECT")
    ) {
      document.activeElement.blur();
    }

    const action = undoStackRef.current.pop();
    redoStackRef.current.push(action);
    saveStoredHistory(undoStackRef.current, redoStackRef.current);
    setStackVersion((v) => v + 1);

    executionCountRef.current += 1;

    // Optimistic cache update (synchronous for instant feedback across all views)
    if (action.type === "ADD") {
      const itemIds = new Set(action.items.map((it) => it.id));
      updateAllOperationsCaches(queryClient, (old) => old.filter((op) => !itemIds.has(op.id)));
      const catStr = action.summary?.categoryName ? ` (${action.summary.categoryName})` : "";
      showToast(`Отменено: добавление ${formatNumber(action.summary?.amount || 0)} ₽${catStr}`);
    } else if (action.type === "DELETE") {
      updateAllOperationsCaches(queryClient, (old) => [action.item, ...old]);
      const catStr = action.item.category_name ? ` (${action.item.category_name})` : "";
      showToast(`Отменено: удаление ${formatNumber(action.item.amount || 0)} ₽${catStr}`);
    } else if (action.type === "UPDATE") {
      const categories = queryClient.getQueryData(["categories"]) || [];
      const banks = queryClient.getQueryData(["banks"]) || [];
      updateAllOperationsCaches(queryClient, (old) =>
        old.map((op) => {
          if (op.id !== action.id) return op;
          const updated = { ...op, ...action.previous };
          if (action.previous.category_id !== undefined) {
            const cat = categories.find((c) => c.id === action.previous.category_id);
            updated.category_name = cat ? cat.name : "";
          }
          if (action.previous.bank_id !== undefined) {
            const b = banks.find((item) => item.id === action.previous.bank_id);
            updated.bank_name = b ? b.name : "";
          }
          return updated;
        }),
      );
      showToast(`Отменено: изменение ${action.summary?.fieldName || "операции"}`);
    }

    // Background network call (serialized via pendingPromiseRef)
    pendingPromiseRef.current = pendingPromiseRef.current
      .then(async () => {
        if (action.type === "ADD") {
          await Promise.all(
            action.items.map(async (it) => {
              try {
                await api.deleteOperation(it.id);
                googleSheetsSync.enqueueAction({
                  type: "DELETE_TRANSACTION",
                  id: it.id,
                });
              } catch (err) {
                // Ignore if already deleted outside this session
                const errMsg = String(err?.message || "");
                if (!errMsg.includes("404") && !errMsg.includes("найдена")) {
                  throw err;
                }
              }
            }),
          );
        } else if (action.type === "DELETE") {
          const payload = {
            id: action.item.id,
            amount: Number(action.item.amount),
            type: action.item.type,
            category_id: action.item.category_id || null,
            bank_id: action.item.bank_id || null,
            date: action.item.date,
            comment: action.item.comment || "",
          };
          await api.addOperation(payload);
          googleSheetsSync.enqueueAction({
            type: "ADD_TRANSACTION",
            data: {
              ...payload,
              category_name: action.item.category_name || "",
              bank_name: action.item.bank_name || "",
              bank_amount: action.item.bank_amount ?? null,
            },
          });
        } else if (action.type === "UPDATE") {
          await api.updateOperation(action.id, action.previous);
          googleSheetsSync.enqueueAction({
            type: "UPDATE_TRANSACTION",
            id: action.id,
            data: action.previous,
          });
        }
      })
      .catch((err) => {
        console.error("Ошибка при отмене действия:", err);
        showToast("Ошибка при отмене действия");
      })
      .finally(() => {
        executionCountRef.current -= 1;
        invalidateTransactionCaches(queryClient);
      });
  }, [queryClient, showToast]);

  const redo = useCallback(() => {
    if (pendingDeletionRef.current) {
      commitPendingDeletion();
    }
    if (redoStackRef.current.length === 0) return;

    if (
      document.activeElement &&
      (document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA" ||
        document.activeElement.tagName === "SELECT")
    ) {
      document.activeElement.blur();
    }

    const action = redoStackRef.current.pop();
    undoStackRef.current.push(action);
    saveStoredHistory(undoStackRef.current, redoStackRef.current);
    setStackVersion((v) => v + 1);

    executionCountRef.current += 1;

    // Optimistic cache update (synchronous for instant feedback across all views)
    if (action.type === "ADD") {
      updateAllOperationsCaches(queryClient, (old) => [...action.items, ...old]);
      const catStr = action.summary?.categoryName ? ` (${action.summary.categoryName})` : "";
      showToast(`Повторено: добавление ${formatNumber(action.summary?.amount || 0)} ₽${catStr}`);
    } else if (action.type === "DELETE") {
      updateAllOperationsCaches(queryClient, (old) => old.filter((op) => op.id !== action.item.id));
      const catStr = action.item.category_name ? ` (${action.item.category_name})` : "";
      showToast(`Повторено: удаление ${formatNumber(action.item.amount || 0)} ₽${catStr}`);
    } else if (action.type === "UPDATE") {
      const categories = queryClient.getQueryData(["categories"]) || [];
      const banks = queryClient.getQueryData(["banks"]) || [];
      updateAllOperationsCaches(queryClient, (old) =>
        old.map((op) => {
          if (op.id !== action.id) return op;
          const updated = { ...op, ...action.next };
          if (action.next.category_id !== undefined) {
            const cat = categories.find((c) => c.id === action.next.category_id);
            updated.category_name = cat ? cat.name : "";
          }
          if (action.next.bank_id !== undefined) {
            const b = banks.find((item) => item.id === action.next.bank_id);
            updated.bank_name = b ? b.name : "";
          }
          return updated;
        }),
      );
      showToast(`Повторено: изменение ${action.summary?.fieldName || "операции"}`);
    }

    // Background network call (serialized via pendingPromiseRef)
    pendingPromiseRef.current = pendingPromiseRef.current
      .then(async () => {
        if (action.type === "ADD") {
          await Promise.all(
            action.items.map((it) => {
              const payload = {
                id: it.id,
                amount: Number(it.amount),
                type: it.type,
                category_id: it.category_id || null,
                bank_id: it.bank_id || null,
                date: it.date,
                comment: it.comment || "",
              };
              googleSheetsSync.enqueueAction({
                type: "ADD_TRANSACTION",
                data: {
                  ...payload,
                  category_name: it.category_name || "",
                  bank_name: it.bank_name || "",
                  bank_amount: it.bank_amount ?? null,
                },
              });
              return api.addOperation(payload);
            }),
          );
        } else if (action.type === "DELETE") {
          try {
            await api.deleteOperation(action.item.id);
            googleSheetsSync.enqueueAction({
              type: "DELETE_TRANSACTION",
              id: action.item.id,
            });
          } catch (err) {
            const errMsg = String(err?.message || "");
            if (!errMsg.includes("404") && !errMsg.includes("найдена")) {
              throw err;
            }
          }
        } else if (action.type === "UPDATE") {
          await api.updateOperation(action.id, action.next);
          googleSheetsSync.enqueueAction({
            type: "UPDATE_TRANSACTION",
            id: action.id,
            data: action.next,
          });
        }
      })
      .catch((err) => {
        console.error("Ошибка при повторе действия:", err);
        showToast("Ошибка при повторе действия");
      })
      .finally(() => {
        executionCountRef.current -= 1;
        invalidateTransactionCaches(queryClient);
      });
  }, [queryClient, showToast, commitPendingDeletion]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;

      const key = e.key?.toLowerCase();
      const code = e.code;
      const keyCode = e.keyCode || e.which;

      const isZ = key === "z" || key === "я" || code === "KeyZ" || keyCode === 90;
      const isY = key === "y" || key === "н" || code === "KeyY" || keyCode === 89;

      const isUndo = isZ && !e.shiftKey && !isY;
      const isRedo = (isZ && e.shiftKey) || isY;

      if (!isUndo && !isRedo) return;

      const target = e.target;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        Boolean(target?.isContentEditable) ||
        Boolean(target?.closest?.("[contenteditable='true']"));

      if (isRedo) {
        if (redoStackRef.current.length > 0) {
          e.preventDefault();
          if (document.activeElement && typeof document.activeElement.blur === "function") {
            document.activeElement.blur();
          }
          redo();
          return;
        }
        return;
      }

      if (isUndo) {
        if (isInput) {
          const val = target?.value;
          const hasText = typeof val === "string" && val.length > 0;
          if (hasText && !target.readOnly) {
            return;
          }
        }

        if (pendingDeletionRef.current) {
          e.preventDefault();
          if (document.activeElement && typeof document.activeElement.blur === "function") {
            document.activeElement.blur();
          }
          pendingDeletionRef.current.cancel();
          return;
        }

        if (undoStackRef.current.length > 0) {
          e.preventDefault();
          if (document.activeElement && typeof document.activeElement.blur === "function") {
            document.activeElement.blur();
          }
          undo();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [undo, redo]);

  const value = useMemo(
    () => ({
      recordAction,
      undo,
      redo,
      deleteWithUndo,
      commitPendingDeletion,
      canUndo:
        stackVersion >= 0 &&
        (undoStackRef.current.length > 0 || Boolean(pendingDeletionRef.current)),
      canRedo: stackVersion >= 0 && redoStackRef.current.length > 0,
      get isExecuting() {
        return executionCountRef.current > 0;
      },
      toast,
    }),
    [recordAction, undo, redo, deleteWithUndo, commitPendingDeletion, stackVersion, toast],
  );

  return (
    <OperationsHistoryContext.Provider value={value}>{children}</OperationsHistoryContext.Provider>
  );
}

export function useOperationsHistory() {
  const context = useContext(OperationsHistoryContext);
  return context;
}
