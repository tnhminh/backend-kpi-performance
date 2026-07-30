import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const jiraIssues = sqliteTable("jira_issues", {
  issueKey: text("issue_key").primaryKey(),
  issueJson: text("issue_json").notNull(),
  lastSyncedAt: text("last_synced_at").notNull(),
});

export const evaluationPeriods = sqliteTable("evaluation_periods", {
  period: text("period").primaryKey(),
  status: text("status").notNull().default("draft"),
  stateJson: text("state_json").notNull().default("{}"),
  updatedAt: text("updated_at").notNull(),
});
