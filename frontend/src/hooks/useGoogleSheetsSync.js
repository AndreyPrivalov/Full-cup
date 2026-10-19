import { useEffect, useState } from "react";
import { googleSheetsSync } from "../utils/googleSheetsSync";

export function useGoogleSheetsSync() {
  const [state, setState] = useState(() => ({
    status: googleSheetsSync.getStatus(),
    pendingCount: googleSheetsSync.getPendingCount(),
    lastSynced: googleSheetsSync.getLastSynced(),
    webhookUrl: googleSheetsSync.getWebhookUrl(),
    lastError: googleSheetsSync.getLastError(),
  }));

  useEffect(() => {
    const unsubscribe = googleSheetsSync.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  return {
    ...state,
    setWebhookUrl: (url) => googleSheetsSync.setWebhookUrl(url),
    validateUrl: (url) => googleSheetsSync.validateUrl(url),
    syncAllNow: () => googleSheetsSync.syncAllNow(),
    pushFullDatabase: () => googleSheetsSync.pushFullDatabase(),
    pullFromSheets: () => googleSheetsSync.pullFromSheets(),
    testConnection: (url) => googleSheetsSync.testConnection(url),
  };
}
