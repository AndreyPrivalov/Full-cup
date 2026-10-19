import { useEffect, useState } from "react";

/**
 * Переход на заданный путь с обновлением HTML5 History API.
 * @param {string} path - Путь назначения (например, "/month", "/kaif", "/settings")
 * @param {{ replace?: boolean }} [options] - Опция замены текущей записи в истории
 */
export function navigate(path, { replace = false } = {}) {
  if (typeof window === "undefined") return;

  const currentPath = window.location.pathname + window.location.search + window.location.hash;
  if (currentPath === path) return;

  if (replace) {
    window.history.replaceState(null, "", path);
  } else {
    window.history.pushState(null, "", path);
  }

  // Оповещаем подписчиков об изменении URL
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * Хук для реактивного отслеживания текущего пути в приложении.
 * @returns {string} Текущий pathname
 */
export function useCurrentPath() {
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window === "undefined") return "/";
    return window.location.pathname || "/";
  });

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname || "/");
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  return currentPath;
}
