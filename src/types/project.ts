import { Database } from './supabase'

export type DBTask = Database['public']['Tables']['tasks']['Row']
export type DBTaskInsert = Database['public']['Tables']['tasks']['Insert']
export type DBTaskUpdate = Database['public']['Tables']['tasks']['Update']
export type DBLink = Database['public']['Tables']['task_dependencies']['Row']
export type DBLinkInsert = Database['public']['Tables']['task_dependencies']['Insert']
export type DBLinkUpdate = Database['public']['Tables']['task_dependencies']['Update']

export interface TaskFormData {
    title: string
    start_date: string | null
    end_date: string | null
    progress: number
    priority: 'low' | 'medium' | 'high' | 'urgent'
    status: 'todo' | 'in_progress' | 'review' | 'done'
    assignee_id: string | null
    description: string | null
    color: string | null
    parent_id?: string | null
    project_id: string
    shift_subsequent?: boolean
}

export type ProjectTask = DBTask
export type TaskInsert = DBTaskInsert
export type TaskUpdate = DBTaskUpdate

export interface ProjectLink extends Omit<DBLink, 'is_deleted'> {
    is_deleted: boolean | null | undefined
}
export type LinkInsert = DBLinkInsert
export type LinkUpdate = DBLinkUpdate

export interface Member {
    id: string
    display_name: string | null
    username: string | null
    email: string | null
    role?: 'owner' | 'manager' | 'member' | null
    colorCode?: string | null
}

export interface Holiday {
    id: string
    name: string
    start_date: string
    end_date: string
    type: 'public_holiday' | 'member_leave' | 'business_trip' | 'workshop' | 'supervision' | 'other' | string
    member_id?: string | null
    member_name?: string
    note?: string | null
}

export interface GanttTask {
    id: string
    text: string
    start_date?: Date
    end_date?: Date
    unscheduled?: boolean
    duration: number
    progress: number
    parent: string | null
    open?: boolean
    type?: string
    status: string

    priority: string
    assignee_id?: string | null
    assignee_name?: string
    color?: string
    description?: string | null
    row_height?: number
    _original_duration?: number
    _original_start?: Date
    _original_end?: Date | null
    _original_progress?: number
}

export interface GanttLink {
    id: string | number
    source: string | number
    target: string | number
    type: string | number
}
