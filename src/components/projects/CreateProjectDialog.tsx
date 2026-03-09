'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

import { createProject } from '@/app/actions/projects'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const projectSchema = z.object({
    name: z.string().min(2, {
        message: '프로젝트 이름은 최소 2글자 이상이어야 합니다.',
    }),
    description: z.string().optional(),
})

type ProjectFormValues = z.infer<typeof projectSchema>

interface CreateProjectDialogProps {
    children: React.ReactNode
}

export function CreateProjectDialog({ children }: CreateProjectDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [isPending, setIsPending] = React.useState(false)
    const router = useRouter()

    const form = useForm<ProjectFormValues>({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            name: '',
            description: '',
        },
    })

    const onSubmit = async (values: ProjectFormValues) => {
        setIsPending(true)
        try {
            const result = await createProject(values.name, values.description)

            if (result.error) {
                toast.error('프로젝트 생성 실패', {
                    description: result.error,
                })
                return
            }

            toast.success('프로젝트가 생성되었습니다.')
            setOpen(false)
            form.reset()

            if (result.project) {
                router.push(`/projects/${result.project.id}`)
            }
        } catch {
            toast.error('오류 발생', {
                description: '프로젝트 생성 중 예상치 못한 오류가 발생했습니다.',
            })
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>새 프로젝트 생성</DialogTitle>
                    <DialogDescription>
                        함께 협업할 새로운 프로젝트를 서비스에 등록합니다.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">프로젝트 이름</Label>
                        <Input
                            id="name"
                            placeholder="예: 마케팅 캠페인 2024"
                            disabled={isPending}
                            {...form.register('name')}
                        />
                        {form.formState.errors.name && (
                            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">설명 (선택)</Label>
                        <Input
                            id="description"
                            placeholder="프로젝트에 대한 간단한 설명"
                            disabled={isPending}
                            {...form.register('description')}
                        />
                    </div>
                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isPending}
                        >
                            취소
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? '생성 중...' : '프로젝트 생성'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
