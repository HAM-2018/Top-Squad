import { integer, pgTable, text, timestamp, serial, boolean, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

//Team Roles
export const teamRole = pgEnum("team_role", ["owner", "admin", "member"]);

//How the challenge is measured
export const challengeMetrics = pgEnum("challenge_metric", [
  "time",
  "distance",
  "reps",
  "weight"
]);

export const challengeMetricValues = [
  "time",
  "distance",
  "reps",
  "weight",
] as const;

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
  avatarUrl: text("avatar_url"),
  ownerUserId: integer("owner_user_id").notNull().references(() => usersTable.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
},
(t) => ({
    // Case-insensitive uniqueness
    uniqTeamNameLower: uniqueIndex("uniq_teams_name_lower").on(sql`lower(${t.name})`),
  }));

export const teamMembersTable = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teamsTable.id, {onDelete: "cascade"}),
  userId: integer("user_id")
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
  groupId: integer("group_id").notNull().references(() => teamsTable.id),
  createdByUserId: integer("created_by_user_id")
    .notNull()
    .references(() => usersTable.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Some challenges might have multiple events / parts
export const challengePartsTable = pgTable("challenge_parts", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id")
    .notNull()
    .references(() => challengeTable.id, { onDelete: "cascade" }),
  // Name of this part, e.g. "Pushups", "1-mile run"
  name: text("name").notNull(),
  metric: challengeMetrics("metric").notNull(),
  // Example 1-mile run under 6 minutes
  targetValue: integer("target_value"),
  unit: text("unit"),
  sortOrder: integer("sort_order").notNull().default(1),
  isTeamLogOnly: boolean("is_team_log_only").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Which team is doing what challenge
export const teamChallengesTable = pgTable("team_challenges", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teamsTable.id, { onDelete: "cascade" }),
  challengeId: integer("challenge_id")
    .notNull()
    .references(() => challengeTable.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
},
(t) => ({
    uniqTeamChallenge: uniqueIndex("uniq_team_challenge").on(t.teamId, t.challengeId),
  }));

// Store results for each user per part of the challenge
export const challengeAttemptsTable = pgTable("challenge_attempts", {
  id: serial("id").primaryKey(),
  teamChallengeId: integer("team_challenge_id")
    .notNull()
    .references(() => teamChallengesTable.id, { onDelete: "cascade" }),
  challengePartId: integer("challenge_part_id")
    .notNull()
    .references(() => challengePartsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  // Recorded value for this part:
  // - time: seconds
  // - distance: meters
  // - reps: count
  value: integer("value").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const challengeResultsTable = pgTable("challenge_results", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id")
    .notNull()
    .references(() => challengeTable.id, { onDelete: "cascade" }),
  partId: integer("part_id")
    .notNull()
    .references(() => challengePartsTable.id, { onDelete: "cascade" }),
  // SOLO / INDIVIDUAL RESULT
  userId: integer("user_id")
    .references(() => usersTable.id),
  // TEAM RESULT (derived from individual attempts)
  teamChallengeId: integer("team_challenge_id")
    .references(() => teamChallengesTable.id, { onDelete: "cascade" }),
  value: integer("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

//Invite teams into the TeamChallenge
export const inviteStatus = pgEnum("invite_status", [
  "pending",
  "accepted",
  "declined",
  "revoked",
]);
export const challengeTeamInvitesTable = pgTable(
  "challenge_team_invites",
  {
    id: serial("id").primaryKey(),
    challengeId: integer("challenge_id")
      .notNull()
      .references(() => challengeTable.id, { onDelete: "cascade" }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teamsTable.id, { onDelete: "cascade" }),
    invitedByUserId: integer("invited_by_user_id")
      .notNull()
      .references(() => usersTable.id),
    status: inviteStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow(),
    respondedAt: timestamp("responded_at"),
  },
  (t) => ({
    uniqInvite: uniqueIndex("uniq_challenge_team_invite").on(t.challengeId, t.teamId),
  })
);
