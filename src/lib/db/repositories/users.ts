import { db, schema } from "../index"
import { eq, asc } from "drizzle-orm"

/**
 * 전제 사용자 목록을 프로필 정보와 함께 조회합니다.
 */
export async function getAllUsersWithProfiles() {
    return await db.select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        displayName: schema.profiles.displayName,
        isAdmin: schema.profiles.isAdmin,
        avatarUrl: schema.profiles.avatarUrl,
    })
    .from(schema.users)
    .leftJoin(schema.profiles, eq(schema.users.id, schema.profiles.id))
    .where(eq(schema.users.isDeleted, false))
    .orderBy(asc(schema.users.email));
}

/**
 * 특정 ID의 상세 사용자 정보를 조회합니다.
 */
export async function getAdminUserById(id: string) {
    const [result] = await db.select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        displayName: schema.profiles.displayName,
        isAdmin: schema.profiles.isAdmin,
        isDeleted: schema.users.isDeleted,
    })
    .from(schema.users)
    .leftJoin(schema.profiles, eq(schema.users.id, schema.profiles.id))
    .where(eq(schema.users.id, id));
    
    return result;
}

/**
 * 신규 사용자와 프로필을 생성합니다.
 */
export async function createAdminUser(data: {
    email: string;
    name: string;
    passwordHash: string;
    isAdmin: boolean;
}) {
    return await db.transaction(async (tx) => {
        const [newUser] = await tx.insert(schema.users).values({
            email: data.email,
            name: data.name,
            password: data.passwordHash,
        }).returning();

        await tx.insert(schema.profiles).values({
            id: newUser.id,
            displayName: data.name,
            isAdmin: data.isAdmin,
        });

        return newUser;
    });
}

/**
 * 사용자 정보를 업데이트합니다. (일반 사용자 프로필 수정 및 관리자 기능 공용)
 */
export async function updateAdminUser(id: string, data: {
    name?: string;
    displayName?: string;
    passwordHash?: string;
    isAdmin?: boolean;
}) {
    return await db.transaction(async (tx) => {
        // Update user table
        const userUpdate: { name?: string; password?: string } = {};
        if (data.name) userUpdate.name = data.name;
        if (data.passwordHash) userUpdate.password = data.passwordHash;
        
        if (Object.keys(userUpdate).length > 0) {
            await tx.update(schema.users)
                .set(userUpdate)
                .where(eq(schema.users.id, id));
        }

        // Update profile table
        const profileUpdate: { displayName?: string; isAdmin?: boolean; updatedAt?: string } = {};
        if (data.displayName) profileUpdate.displayName = data.displayName;
        if (data.isAdmin !== undefined) profileUpdate.isAdmin = data.isAdmin;
        profileUpdate.updatedAt = new Date().toISOString();

        if (Object.keys(profileUpdate).length > 0) {
            await tx.update(schema.profiles)
                .set(profileUpdate)
                .where(eq(schema.profiles.id, id));
        }
    });
}

/**
 * 사용자와 프로필을 삭제(Soft Delete)합니다.
 */
export async function deleteUser(id: string) {
    return await db.update(schema.users)
        .set({ 
            isDeleted: true,
            deletedAt: new Date().toISOString()
        })
        .where(eq(schema.users.id, id));
}
