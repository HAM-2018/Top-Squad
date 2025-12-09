import { integer, pgTable, text, timestamp, serial, boolean, pgEnum } from "drizzle-orm/pg-core";


//Team Roles
export const teamRole = pgEnum("team_role", ["owner", "admin", "member"]);

//How the challenge is measured
export const challengeMetrics = pgEnum("challenge_metric", [
  "time",
  "distance",
  "reps",
]);

export const usersTable = pgTable("users", {
   id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ownerUserId: serial("owner_user_id").notNull().references(() => usersTable.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teamMembersTable = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: serial("team_id")
    .notNull()
    .references(() => teamsTable.id, {onDelete: "cascade"}),
  userId: serial("user_id")
    .notNull()
    .references(() => usersTable.id),
  role: teamRole("role")    
    .notNull()
    .default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const challengeTable = pgTable("challenge", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  isTeamBased: boolean("is_team_based").notNull().default(false),
  createdByUserId: serial("created_by_user_id")
    .notNull()
    .references(() => usersTable.id),

  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

//Some challenges might have multiple events

export const challengePartsTable = pgTable("challenge_parts", {
   id: serial("id").primaryKey(),
  challengeId: serial("challenge_id")
    .notNull()
    .references(() => challengeTable.id, { onDelete: "cascade" }),
  // Name of this part, e.g. "Pushups", "1-mile run"
  name: text("name").notNull(),
  metric: challengeMetrics("metric").notNull(), 
  //Example 1-mile run under 6 minutes
  targetValue: integer("target_value"),
  unit: text("unit"),
  sortOrder: integer("sort_order").notNull().default(1),

  createdAt: timestamp("created_at").defaultNow(),
});

