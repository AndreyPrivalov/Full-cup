/**
 * Tries to collapse a new action with existing actions in the sync queue.
 * Modifies the queue in-place if an action can be collapsed/merged,
 * and returns true. Otherwise returns false (meaning action should be appended).
 */
export function collapseQueueAction(queue, newAct) {
  if (!newAct?.type) return true;

  // 1. DELETE_TRANSACTION cancels out un-sent ADD_TRANSACTION with same ID
  if (newAct.type === "DELETE_TRANSACTION" && newAct.id) {
    const targetId = String(newAct.id);
    const addIdx = queue.findIndex(
      (a) => a.type === "ADD_TRANSACTION" && String(a.data?.id) === targetId,
    );
    if (addIdx !== -1) {
      // Record was created and deleted within debounce window!
      // Remove ADD and any intermediate UPDATEs for this ID
      const remaining = queue.filter(
        (a, idx) =>
          idx !== addIdx && !(a.type === "UPDATE_TRANSACTION" && String(a.id) === targetId),
      );
      queue.length = 0;
      queue.push(...remaining);
      return true;
    }
  }

  // 2. ADD_TRANSACTION cancels out un-sent DELETE_TRANSACTION (Undo delete)
  if (newAct.type === "ADD_TRANSACTION" && newAct.data?.id) {
    const targetId = String(newAct.data.id);
    const delIdx = queue.findIndex(
      (a) => a.type === "DELETE_TRANSACTION" && String(a.id) === targetId,
    );
    if (delIdx !== -1) {
      queue.splice(delIdx, 1);
      queue.push({
        type: "UPDATE_TRANSACTION",
        id: newAct.data.id,
        data: newAct.data,
      });
      return true;
    }
  }

  // 3. Merge successive UPDATE_TRANSACTION for the same ID
  if (newAct.type === "UPDATE_TRANSACTION" && newAct.id) {
    const targetId = String(newAct.id);
    const existingAdd = queue.find(
      (a) => a.type === "ADD_TRANSACTION" && String(a.data?.id) === targetId,
    );
    if (existingAdd?.data) {
      Object.assign(existingAdd.data, newAct.data);
      return true;
    }

    const existingUpdate = queue.find(
      (a) => a.type === "UPDATE_TRANSACTION" && String(a.id) === targetId,
    );
    if (existingUpdate?.data) {
      Object.assign(existingUpdate.data, newAct.data);
      return true;
    }
  }

  // 4. Merge UPDATE_SAVING
  if (newAct.type === "UPDATE_SAVING" && newAct.id) {
    const targetId = String(newAct.id);
    const existingAdd = queue.find(
      (a) => a.type === "ADD_SAVING" && String(a.data?.id) === targetId,
    );
    if (existingAdd?.data) {
      Object.assign(existingAdd.data, newAct.data);
      return true;
    }

    const existingUpdate = queue.find(
      (a) => a.type === "UPDATE_SAVING" && String(a.id) === targetId,
    );
    if (existingUpdate?.data) {
      Object.assign(existingUpdate.data, newAct.data);
      return true;
    }
  }

  return false;
}
