export interface SummaryTask {
  status: string | null
  parentId: string | null
  progress: number | null
  endDate: string | null
}

export interface TaskCountSummary {
  total: number
  completed: number
  incomplete: number
  inProgress: number
}

export interface TaskSummary {
  allTasks: TaskCountSummary
  managementTasks: TaskCountSummary
  progress: number
  dueSoon: number
  overdue: number
  noDueDate: number
}

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

const countTasks = (tasks: SummaryTask[]): TaskCountSummary => ({
  total: tasks.length,
  completed: tasks.filter(task => task.status === 'done').length,
  incomplete: tasks.filter(task => task.status !== 'done').length,
  inProgress: tasks.filter(task => task.status === 'in_progress').length,
})

export function calculateTaskSummary(tasks: SummaryTask[], asOf: string): TaskSummary {
  const managementTasks = tasks.filter(task => !task.parentId)
  const progressTasks = managementTasks.length > 0 ? managementTasks : tasks
  const progress = progressTasks.length > 0
    ? Math.round(progressTasks.reduce((sum, task) => sum + (task.progress ?? 0), 0) / progressTasks.length)
    : 0
  const dueThrough = addDays(asOf, 3)
  const incompleteTasks = tasks.filter(task => task.status !== 'done')

  return {
    allTasks: countTasks(tasks),
    managementTasks: countTasks(managementTasks),
    progress,
    dueSoon: incompleteTasks.filter(task => task.endDate && task.endDate >= asOf && task.endDate <= dueThrough).length,
    overdue: incompleteTasks.filter(task => task.endDate && task.endDate < asOf).length,
    noDueDate: incompleteTasks.filter(task => !task.endDate).length,
  }
}
