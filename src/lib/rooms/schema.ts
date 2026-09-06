import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "@/lib/auth/schema";

export const room = pgTable("room", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  approvalMode: text("approval_mode").default("majority").notNull(),
  approvalThreshold: integer("approval_threshold"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const roomMember = pgTable(
  "room_member",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("room_member_room_user_idx").on(table.roomId, table.userId),
    index("room_member_roomId_idx").on(table.roomId),
    index("room_member_userId_idx").on(table.userId),
  ],
);

export const roomInvite = pgTable(
  "room_invite",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    invitedUserId: text("invited_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    invitedById: text("invited_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("room_invite_room_user_idx").on(table.roomId, table.invitedUserId),
    index("room_invite_invitedUserId_idx").on(table.invitedUserId),
  ],
);

export const suggestion = pgTable(
  "suggestion",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    suggestedById: text("suggested_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tmdbId: integer("tmdb_id").notNull(),
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    releaseYear: text("release_year"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    suggestedAt: timestamp("suggested_at").defaultNow().notNull(),
  },
  (table) => [
    index("suggestion_room_status_idx").on(table.roomId, table.status),
    uniqueIndex("suggestion_room_tmdb_pending_idx")
      .on(table.roomId, table.tmdbId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

export const suggestionVote = pgTable(
  "suggestion_vote",
  {
    id: text("id").primaryKey(),
    suggestionId: text("suggestion_id")
      .notNull()
      .references(() => suggestion.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("suggestion_vote_suggestion_user_idx").on(
      table.suggestionId,
      table.userId,
    ),
  ],
);

export const queueEntry = pgTable(
  "queue_entry",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    tmdbId: integer("tmdb_id").notNull(),
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    releaseYear: text("release_year"),
    position: integer("position").notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),
    sourceSuggestionId: text("source_suggestion_id").references(
      () => suggestion.id,
      { onDelete: "set null" },
    ),
  },
  (table) => [
    uniqueIndex("queue_entry_room_tmdb_idx").on(table.roomId, table.tmdbId),
    uniqueIndex("queue_entry_room_position_idx").on(table.roomId, table.position),
  ],
);

export const watchHistory = pgTable(
  "watch_history",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    tmdbId: integer("tmdb_id").notNull(),
    title: text("title").notNull(),
    posterPath: text("poster_path"),
    releaseYear: text("release_year"),
    watchedById: text("watched_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    watchedAt: timestamp("watched_at").defaultNow().notNull(),
    sourceQueueEntryId: text("source_queue_entry_id").references(
      () => queueEntry.id,
      { onDelete: "set null" },
    ),
  },
  (table) => [
    uniqueIndex("watch_history_room_tmdb_idx").on(table.roomId, table.tmdbId),
    index("watch_history_roomId_idx").on(table.roomId),
  ],
);

export const roomRelations = relations(room, ({ one, many }) => ({
  owner: one(user, { fields: [room.ownerId], references: [user.id] }),
  members: many(roomMember),
  invites: many(roomInvite),
  suggestions: many(suggestion),
  queueEntries: many(queueEntry),
  history: many(watchHistory),
}));

export const roomMemberRelations = relations(roomMember, ({ one }) => ({
  room: one(room, { fields: [roomMember.roomId], references: [room.id] }),
  user: one(user, { fields: [roomMember.userId], references: [user.id] }),
}));

export const roomInviteRelations = relations(roomInvite, ({ one }) => ({
  room: one(room, { fields: [roomInvite.roomId], references: [room.id] }),
  invitedUser: one(user, {
    fields: [roomInvite.invitedUserId],
    references: [user.id],
  }),
  invitedBy: one(user, {
    fields: [roomInvite.invitedById],
    references: [user.id],
  }),
}));

export const suggestionRelations = relations(suggestion, ({ one, many }) => ({
  room: one(room, { fields: [suggestion.roomId], references: [room.id] }),
  suggestedBy: one(user, {
    fields: [suggestion.suggestedById],
    references: [user.id],
  }),
  votes: many(suggestionVote),
}));

export const suggestionVoteRelations = relations(suggestionVote, ({ one }) => ({
  suggestion: one(suggestion, {
    fields: [suggestionVote.suggestionId],
    references: [suggestion.id],
  }),
  user: one(user, { fields: [suggestionVote.userId], references: [user.id] }),
}));

export const queueEntryRelations = relations(queueEntry, ({ one }) => ({
  room: one(room, { fields: [queueEntry.roomId], references: [room.id] }),
  sourceSuggestion: one(suggestion, {
    fields: [queueEntry.sourceSuggestionId],
    references: [suggestion.id],
  }),
}));

export const watchHistoryRelations = relations(watchHistory, ({ one }) => ({
  room: one(room, { fields: [watchHistory.roomId], references: [room.id] }),
  watchedBy: one(user, {
    fields: [watchHistory.watchedById],
    references: [user.id],
  }),
  sourceQueueEntry: one(queueEntry, {
    fields: [watchHistory.sourceQueueEntryId],
    references: [queueEntry.id],
  }),
}));