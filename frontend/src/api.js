const API_URL = `http://${window.location.hostname}:3001/api`;

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }
  return response.json();
};

export const api = {
  // Дашборд
  getDashboard: (controlPeriod) => {
    const query = controlPeriod ? `?control_period=${controlPeriod}` : "";
    return fetch(`${API_URL}/dashboard${query}`).then(handleResponse);
  },

  // Категории
  getCategories: () => fetch(`${API_URL}/categories`).then(handleResponse),

  // Банки
  getBanks: () => fetch(`${API_URL}/banks`).then(handleResponse),
  addBank: (data) =>
    fetch(`${API_URL}/banks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse),
  updateBank: (id, data) =>
    fetch(`${API_URL}/banks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse),
  deleteBank: (id) =>
    fetch(`${API_URL}/banks/${id}`, {
      method: "DELETE",
    }).then((res) => {
      if (!res.ok) throw new Error("Ошибка при удалении банка");
      return null;
    }),

  // Операции (Транзакции)
  getOperations: () => fetch(`${API_URL}/transactions`).then(handleResponse),
  addOperation: (data) =>
    fetch(`${API_URL}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse),
  deleteOperation: (id) =>
    fetch(`${API_URL}/transactions/${id}`, {
      method: "DELETE",
    }).then((res) => {
      if (!res.ok) throw new Error("Ошибка при удалении операции");
      return null;
    }),
  updateOperation: (id, data) =>
    fetch(`${API_URL}/transactions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse),

  // Накопления
  getSavings: () => fetch(`${API_URL}/savings`).then(handleResponse),
  addSaving: (data) =>
    fetch(`${API_URL}/savings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse),
  updateSaving: (id, data) =>
    fetch(`${API_URL}/savings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse),

  // Проекты
  getProjects: () => fetch(`${API_URL}/projects`).then(handleResponse),
  addProject: (data) =>
    fetch(`${API_URL}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse),
  updateProject: (id, data) =>
    fetch(`${API_URL}/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse),
  deleteProject: (id) =>
    fetch(`${API_URL}/projects/${id}`, {
      method: "DELETE",
    }).then((res) => {
      if (!res.ok) throw new Error("Ошибка при удалении проекта");
      return null;
    }),
  getProjectsBudgets: (month) =>
    fetch(`${API_URL}/projects/budgets?month=${month}`).then(handleResponse),
  getProjectsMonths: () => fetch(`${API_URL}/projects/budgets/months`).then(handleResponse),
  updateProjectBudgetLimits: (data) =>
    fetch(`${API_URL}/projects/budgets/limits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse),
  updateProjectBudgetAllocation: (data) =>
    fetch(`${API_URL}/projects/budgets/allocations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(handleResponse),
};
