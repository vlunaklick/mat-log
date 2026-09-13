import { boolean, index, integer, jsonb, pgTable, serial, smallint, text, timestamp, doublePrecision, bigint } from "drizzle-orm/pg-core";
import type { Position, Roll, Style, TechniqueType } from "../../../src/lib/types.ts";

// ---- Better Auth tables (shape required by the drizzle adapter) ----
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()).notNull(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// ---- Mat Log tables. Every row belongs to a user. ----
export const trainingSessions = pgTable(
  "training_session",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    style: text("style").$type<Style>().notNull(),
    durationMin: integer("duration_min").notNull(),
    classTopic: text("class_topic").notNull().default(""),
    techniqueIds: jsonb("technique_ids").$type<number[]>().notNull().default([]),
    rolls: jsonb("rolls").$type<Roll[]>().notNull().default([]),
    whatWorked: text("what_worked").notNull().default(""),
    whatFailed: text("what_failed").notNull().default(""),
    nextFocus: text("next_focus").notNull().default(""),
    energy: smallint("energy").notNull().default(3),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("training_session_user_date_idx").on(t.userId, t.date)],
);

export const techniques = pgTable(
  "technique",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: text("position").$type<Position>().notNull(),
    type: text("type").$type<TechniqueType>().notNull(),
    steps: text("steps").notNull().default(""),
    details: text("details").notNull().default(""),
    mistakes: text("mistakes").notNull().default(""),
    videoUrl: text("video_url"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    ease: doublePrecision("ease").notNull().default(2.5),
    intervalDays: integer("interval_days").notNull().default(0),
    dueAt: bigint("due_at", { mode: "number" }).notNull(),
    reviewCount: integer("review_count").notNull().default(0),
  },
  (t) => [index("technique_user_due_idx").on(t.userId, t.dueAt)],
);

export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  beltStartDate: text("belt_start_date"),
  weeklyGoalSessions: integer("weekly_goal_sessions").notNull().default(3),
});

export const chatMessages = pgTable(
  "chat_message",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<"user" | "assistant">().notNull(),
    content: text("content").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [index("chat_message_user_created_idx").on(t.userId, t.createdAt)],
);
