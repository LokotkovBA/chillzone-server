import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import type { z } from 'zod';

export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    nickname: text('nickname'),
    name: text('name'),
    birthday: text('birthday'),
    discord: text('discord'),
    join: text('join'),
});

export const insertUsersSchema = createInsertSchema(users);
export const selectUsersSchema = createSelectSchema(users);

export type User = z.infer<typeof selectUsersSchema>;
