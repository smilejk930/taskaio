import { db, schema } from "../index"
import { asc, eq } from "drizzle-orm"

/**
 * 모든 프로필 목록을 조회합니다. (이름순)
 */
export async function getAllProfiles() {
    return await db.select({
        id: schema.profiles.id,
        displayName: schema.profiles.displayName,
        avatarUrl: schema.profiles.avatarUrl,
    })
    .from(schema.profiles)
    .orderBy(asc(schema.profiles.displayName));
}

/**
 * 특정 ID의 프로필을 조회합니다.
 */
export async function getProfileById(id: string) {
    const [profile] = await db.select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, id));
    return profile;
}
