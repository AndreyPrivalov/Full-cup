import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: api.getProjects,
    staleTime: 5000,
  });
}

export function useProjectsMonths() {
  return useQuery({
    queryKey: ["projectsMonths"],
    queryFn: api.getProjectsMonths,
    staleTime: 5000,
  });
}

export function useProjectsBudgets(month) {
  return useQuery({
    queryKey: ["projectsBudgets", month],
    queryFn: () => api.getProjectsBudgets(month),
    enabled: !!month,
    staleTime: 5000,
  });
}

export function useAddProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.addProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => api.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["projectsBudgets"] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["projectsBudgets"] });
    },
  });
}

export function useUpdateProjectBudgetLimits() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateProjectBudgetLimits,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projectsBudgets", variables.month] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateProjectBudgetAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateProjectBudgetAllocation,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projectsBudgets", variables.month] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
