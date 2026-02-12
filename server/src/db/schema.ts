import { pgTable, text, uuid, timestamp, boolean, integer, jsonb, real } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  apiKey: text("api_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  platform: text("platform").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const folders = pgTable("folders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  pathTemplate: text("path_template"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const clips = pgTable("clips", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceId: uuid("device_id").references(() => devices.id, { onDelete: "set null" }),
  contentType: text("content_type").notNull(),
  textContent: text("text_content"),
  blobUrl: text("blob_url"),
  tags: jsonb("tags").$type<unknown>(),
  folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
  isPinned: boolean("is_pinned").notNull().default(false),
  isStarred: boolean("is_starred").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  hotkeySlot: integer("hotkey_slot"),
  source: text("source").notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const rules = pgTable("rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  matchType: text("match_type").notNull(),
  pattern: text("pattern").notNull(),
  action: text("action").notNull(),
  params: jsonb("params").$type<Record<string, unknown> | null>(),
  priority: integer("priority").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const predictions = pgTable("predictions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  predictedContent: text("predicted_content").notNull(),
  actualContent: text("actual_content"),
  confidence: real("confidence").notNull().default(0.0),
  wasCorrect: boolean("was_correct"),
  context: jsonb("context").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const predictionStats = pgTable("prediction_stats", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  windowSize: integer("window_size").notNull().default(100),
  accuracy: real("accuracy").notNull().default(0.0),
  totalPredictions: integer("total_predictions").notNull().default(0),
  correctPredictions: integer("correct_predictions").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clipId: uuid("clip_id").references(() => clips.id, { onDelete: "set null" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  workflow: text("workflow"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Clip = typeof clips.$inferSelect;
export type Rule = typeof rules.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
