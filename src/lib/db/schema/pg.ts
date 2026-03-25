import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
} from "drizzle-orm/pg-core"



export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  password: text("password"),
  image: text("image"),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at", { mode: "string" }),
})

/** 
 * Application Tables 
 */

export const profiles = pgTable("profiles", {
  id: text("id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }), // 1:1 with users
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  isAdmin: boolean("is_admin").default(false),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
})

export const projects = pgTable("projects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  creatorId: text("creator_id").references(() => profiles.id, { onDelete: "set null" }),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
})

export const projectMembers = pgTable(
  "project_members",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "manager", "member"] }).notNull().default("member"),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })]
)

export const tasks = pgTable("tasks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["todo", "in_progress", "review", "done"] }).default("todo"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).default("medium"),
  assigneeId: text("assignee_id").references(() => profiles.id, { onDelete: "set null" }),
  parentId: text("parent_id"), // self-reference
  startDate: text("start_date"), // string for date format simplicity like Supabase did
  endDate: text("end_date"),
  progress: integer("progress").default(0),
  color: text("color"),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
})

export const taskDependencies = pgTable("task_dependencies", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  sourceId: text("source_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  targetId: text("target_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
})

export const holidays = pgTable("holidays", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  type: text("type", { enum: ["public_holiday", "member_leave", "business_trip", "workshop", "other"] }).notNull(),
  memberId: text("member_id").references(() => profiles.id, { onDelete: "cascade" }),
  note: text("note"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
})
