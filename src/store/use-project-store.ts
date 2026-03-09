import { create } from 'zustand'
import { Tables } from '@/types/supabase'

type Project = Tables<'projects'>
type Task = Tables<'tasks'>
type Member = Tables<'profiles'> & { role: Tables<'project_members'>['role'] }

interface ProjectState {
    projects: Project[]
    currentProject: Project | null
    tasks: Task[]
    members: Member[]
    isLoading: boolean

    // Actions
    setProjects: (projects: Project[]) => void
    setCurrentProject: (project: Project | null) => void
    setTasks: (tasks: Task[]) => void
    setMembers: (members: Member[]) => void
    setLoading: (isLoading: boolean) => void

    // Computed (Helper)
    getTaskById: (id: string) => Task | undefined
    getChildTasks: (parentId: string) => Task[]
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    currentProject: null,
    tasks: [],
    members: [],
    isLoading: false,

    setProjects: (projects) => set({ projects }),
    setCurrentProject: (currentProject) => set({ currentProject }),
    setTasks: (tasks) => set({ tasks }),
    setMembers: (members) => set({ members }),
    setLoading: (isLoading) => set({ isLoading }),

    getTaskById: (id) => get().tasks.find((t) => t.id === id),
    getChildTasks: (parentId) => get().tasks.filter((t) => t.parent_id === parentId),
}))
