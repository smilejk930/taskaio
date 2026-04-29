'use client'

import React, { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit2, Trash2, ShieldCheck, User as UserIcon, MoreHorizontal } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserDialog } from './UserDialog'
import { deleteAdminUserAction } from '@/app/actions/admin-users'
import { toast } from 'sonner'

type AdminUser = {
    id: string
    username: string | null
    email: string | null
    name: string | null
    displayName: string | null
    isAdmin: boolean | null
}

interface UserTableProps {
    users: AdminUser[]
    currentUserId: string
}

export function UserTable({ users, currentUserId }: UserTableProps) {
    const [selectedUser, setSelectedUser] = useState<AdminUser | undefined>(undefined)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const handleDelete = async (id: string) => {
        if (!confirm('정말로 이 사용자를 삭제하시겠습니까?')) return

        const result = await deleteAdminUserAction(id)
        if (result?.error) {
            toast.error(result.error)
        } else {
            toast.success('사용자가 삭제되었습니다.')
        }
    }

    const handleEdit = (user: AdminUser) => {
        setSelectedUser(user)
        setIsDialogOpen(true)
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">형태</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>아이디</TableHead>
                        <TableHead>이메일</TableHead>
                        <TableHead>권한</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                등록된 사용자가 없습니다.
                            </TableCell>
                        </TableRow>
                    ) : (
                        users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary">
                                        {user.isAdmin ? (
                                            <ShieldCheck className="w-4 h-4 text-primary" />
                                        ) : (
                                            <UserIcon className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                    {user.displayName || user.name || '-'}
                                    {user.id === currentUserId && (
                                        <Badge variant="outline" className="ml-2 text-[10px] py-0">본인</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{user.username || '-'}</TableCell>
                                <TableCell className="text-muted-foreground">{user.email || '-'}</TableCell>
                                <TableCell>
                                    <Badge variant={user.isAdmin ? "default" : "secondary"}>
                                        {user.isAdmin ? "시스템 관리자" : "일반 사용자"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>메뉴</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => handleEdit(user)}>
                                                <Edit2 className="mr-2 h-4 w-4" />
                                                수정
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(user.id)}
                                                className="text-destructive focus:text-destructive"
                                                disabled={user.id === currentUserId}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                삭제
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <UserDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                user={selectedUser}
                onSuccess={() => {
                    setIsDialogOpen(false)
                    setSelectedUser(undefined)
                }}
            />
        </div>
    )
}
