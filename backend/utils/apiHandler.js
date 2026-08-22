export const apiHandler = (handler) => (req, res, next) => {
  try {
    const result = handler(req, res, next);
    if (result instanceof Promise) {
      result.catch((error) => handleError(error, res));
    }
  } catch (error) {
    handleError(error, res);
  }
};

const handleError = (error, res) => {
  if (error.name === "ZodError") {
    return res.status(400).json({ error: error.errors[0].message, details: error.errors });
  }
  if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
    return res.status(409).json({ error: "Запись с такими данными уже существует" });
  }
  if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
    return res.status(400).json({ error: "Невозможно удалить, так как есть связанные данные" });
  }
  console.error("API Error:", error);
  res.status(500).json({ error: "Внутренняя ошибка сервера" });
};
