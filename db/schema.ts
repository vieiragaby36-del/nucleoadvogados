import { integer, sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull().default(""),
  kind: text("kind").notNull().default("lead"),
  stage: text("stage").notNull().default("novo"),
  source: text("source").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_contacts_email").on(table.email),
  index("idx_contacts_kind_stage").on(table.kind, table.stage),
]);

export const cases = sqliteTable("cases", {
  id: text("id").primaryKey(),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  area: text("area").notNull().default(""),
  number: text("number").notNull().default(""),
  status: text("status").notNull().default("em andamento"),
  description: text("description").notNull().default(""),
  visibleToClient: integer("visible_to_client").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_cases_contact_id").on(table.contactId)]);

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  caseId: text("case_id").references(() => cases.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  dueAt: text("due_at").notNull().default(""),
  done: integer("done").notNull().default(0),
  visibleToClient: integer("visible_to_client").notNull().default(0),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_tasks_contact_due").on(table.contactId, table.dueAt)]);

export const staff = sqliteTable("staff", {
  email: text("email").primaryKey(),
  createdAt: text("created_at").notNull(),
});
