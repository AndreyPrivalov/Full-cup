import { useEffect, useRef } from "react";

/**
 * Хук для отслеживания тройного нажатия заданной клавиши вне полей ввода.
 * Поддерживает русскую и английскую раскладки по event.code ("KeyD") и event.key.
 *
 * @param {string} targetKey - Целевая клавиша (по умолчанию "d")
 * @param {() => void} onTrigger - Функция обратного вызова при успешном тройном нажатии
 * @param {number} [timeoutMs=800] - Временное окно для тройного нажатия (в мс)
 */
export function useTripleKey(targetKey = "d", onTrigger, timeoutMs = 800) {
  const onTriggerRef = useRef(onTrigger);
  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  const timestampsRef = useRef([]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Игнорируем нажатия с модификаторами (Ctrl, Alt, Meta)
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      // Проверяем, находится ли фокус в поле ввода
      const target = e.target;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.closest?.('input, textarea, select, [contenteditable="true"]'))
      ) {
        return;
      }

      // Проверяем соответствие клавиши (по символу или физическому коду KeyD для клавиши d)
      const isMatch =
        e.key.toLowerCase() === targetKey.toLowerCase() ||
        (targetKey.toLowerCase() === "d" && (e.code === "KeyD" || e.key.toLowerCase() === "в"));

      if (!isMatch) {
        // Если нажата другая клавиша, сбрасываем последовательность
        timestampsRef.current = [];
        return;
      }

      const now = Date.now();
      const updatedTimestamps = [...timestampsRef.current, now].filter(
        (time) => now - time <= timeoutMs,
      );

      timestampsRef.current = updatedTimestamps;

      if (updatedTimestamps.length >= 3) {
        timestampsRef.current = [];
        onTriggerRef.current?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [targetKey, timeoutMs]);
}
