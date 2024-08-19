import { users, type User } from '@/db/schema/users';
import { eq, like } from 'drizzle-orm';
import { db } from '@/db';
import Elysia, { t } from 'elysia';
import { monthRU } from '@/utils';
import cors from '@elysiajs/cors';
import swagger from '@elysiajs/swagger';
import { env } from '@/env';

const monthMap = new Map<string, User[]>();

new Elysia()
    .use(swagger())
    .use(cors({ origin: env.FRONT_URL }))
    .get(
        '/user/:id',
        async ({ params: { id }, error }) => {
            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.id, id));

            if (!user) {
                return error(404, 'User not found');
            }

            return user;
        },
        {
            params: t.Object({ id: t.Number() }),
        },
    )
    .delete(
        '/user/:id',
        async ({ params: { id }, error }) => {
            const [user] = await db
                .delete(users)
                .where(eq(users.id, id))
                .returning();

            if (!user) {
                return error(404, 'User not found');
            }

            if (user.birthday) {
                const monthStr = user.birthday.split('.')[1];
                monthMap.delete(monthStr);
            }

            return user;
        },
        {
            params: t.Object({ id: t.Number() }),
        },
    )
    .patch(
        '/user/:id',
        async ({ params: { id }, body, error }) => {
            let monthStr = '';
            if (body.birthday) {
                monthStr = body.birthday.split('.')[1];
                if (!monthStr) return error(400, 'Invalid birthday');
            }

            const [user] = await db
                .update(users)
                .set(body)
                .where(eq(users.id, id))
                .returning();

            if (!user) return error(500);

            if (user.birthday && !monthStr) {
                monthStr = user.birthday.split('.')[1];
            }

            if (monthStr && monthMap.has(monthStr)) {
                monthMap.delete(monthStr);
            }
            return user;
        },
        {
            params: t.Object({ id: t.Number() }),
            body: t.Object({
                name: t.Optional(t.Nullable(t.String())),
                nickname: t.Optional(t.Nullable(t.String())),
                birthday: t.String(),
                discord: t.String(),
                join: t.Optional(t.Nullable(t.String())),
            }),
        },
    )
    .post(
        '/user',
        async ({ body, error }) => {
            if (!body.discord || !body.birthday) {
                return error(400, 'Discord or birthday is missing!');
            }

            const monthStr = body.birthday.split('.')[1];
            if (!monthStr) return error(400, 'Invalid birthday');

            const ex = await db
                .select()
                .from(users)
                .where(eq(users.discord, body.discord));
            if (ex.length) {
                return error(400, 'User already exist');
            }

            const [item] = await db.insert(users).values(body).returning();

            if (monthMap.has(monthStr)) {
                monthMap.delete(monthStr);
            }

            return item;
        },
        {
            body: t.Object({
                name: t.Optional(t.Nullable(t.String())),
                nickname: t.Optional(t.Nullable(t.String())),
                birthday: t.String(),
                discord: t.String(),
                join: t.Optional(t.Nullable(t.String())),
            }),
        },
    )
    .get(
        '/users/:month',
        async ({ params: { month }, error }) => {
            if (month < 0 || month > 11) {
                return error(400, 'Invalid month');
            }

            const monthStr = monthRU[month];

            if (monthMap.has(monthStr)) {
                return monthMap.get(monthStr);
            }

            const bdays = await db
                .select()
                .from(users)
                .where(like(users.birthday, `%${monthStr}`));
            monthMap.set(monthStr, bdays);

            return bdays;
        },
        {
            params: t.Object({ month: t.Number() }),
        },
    )
    .listen(env.SERVER_PORT);

console.log('Listening on port:', env.SERVER_PORT);
