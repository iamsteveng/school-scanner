import { describe, expect, it, vi } from "vitest";
import type { MutationCtx } from "../convex/_generated/server";
import { consumeVerificationLinkHandler } from "../convex/verificationFlow";
import { createVerificationTokenHandler } from "../convex/verificationTokens";

type TokenDoc = {
  _id: string;
  token: string;
  phone: string;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
};

type UserDoc = {
  _id: string;
  phone: string;
  createdAt: number;
  updatedAt: number;
  verifiedAt?: number;
};

type QueryField = keyof TokenDoc | keyof UserDoc;

class FakeQuery<T extends { [key: string]: unknown }> {
  private field: QueryField | null = null;
  private value: string | number | null = null;

  constructor(private readonly store: T[]) {}

  withIndex(_name: string, builder: (q: FakeQuery<T>) => FakeQuery<T>) {
    return builder(this);
  }

  eq(field: QueryField, value: string | number) {
    this.field = field;
    this.value = value;
    return this;
  }

  async collect() {
    if (!this.field || this.value === null) {
      return [];
    }
    return this.store.filter((doc) => doc[this.field!] === this.value);
  }

  async unique() {
    const results = await this.collect();
    return results[0] ?? null;
  }
}

class FakeDb {
  private tokens: TokenDoc[] = [];
  private users: UserDoc[] = [];
  private idCounter = 0;

  query(table: "verification_tokens" | "users") {
    if (table === "verification_tokens") {
      return new FakeQuery(this.tokens);
    }
    return new FakeQuery(this.users);
  }

  async insert(
    table: "verification_tokens" | "users",
    doc: Omit<TokenDoc, "_id"> | Omit<UserDoc, "_id">,
  ) {
    const _id = `${table}_${this.idCounter++}`;
    if (table === "verification_tokens") {
      this.tokens.push({ _id, ...(doc as Omit<TokenDoc, "_id">) });
    } else if (table === "users") {
      this.users.push({ _id, ...(doc as Omit<UserDoc, "_id">) });
    }
    return _id;
  }

  async patch(
    id: string,
    patch: Partial<TokenDoc> | Partial<UserDoc> | Partial<SessionDoc>,
  ) {
    const target =
      this.tokens.find((doc) => doc._id === id) ??
      this.users.find((doc) => doc._id === id) ??
      this.sessions.find((doc) => doc._id === id);

    if (!target) {
      throw new Error("Doc not found");
    }

    Object.assign(target, patch);
  }

  getAll(table: "verification_tokens" | "users") {
    if (table === "verification_tokens") {
      return this.tokens;
    }
    if (table === "users") {
      return this.users;
    }
    return [];
  }
}

function makeCtx() {
  return { db: new FakeDb() };
}

describe("verification link handling", () => {
  it("creates a new user and session for first-time verification", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-25T10:00:00Z"));

    const ctx = makeCtx() as unknown as MutationCtx;
    const { token } = await createVerificationTokenHandler(ctx, {
      phone: "+85251234567",
    });

    const result = await consumeVerificationLinkHandler(ctx, { token });

    expect(result.redirectTo).toBe("/schools");

    const users = (ctx.db as unknown as FakeDb).getAll("users");
    expect(users).toHaveLength(1);
    expect(users[0].phone).toBe("+85251234567");
    expect(users[0].verifiedAt).toBe(Date.now());
    vi.useRealTimers();
  });

  it("returns dashboard for existing users", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-25T10:00:00Z"));

    const ctx = makeCtx() as unknown as MutationCtx;
    const db = ctx.db as unknown as FakeDb;

    const userId = await db.insert("users", {
      phone: "+85251234567",
      createdAt: Date.now() - 1000,
      updatedAt: Date.now() - 1000,
      verifiedAt: Date.now() - 1000,
    });

    const { token } = await createVerificationTokenHandler(ctx, {
      phone: "+85251234567",
    });

    const result = await consumeVerificationLinkHandler(ctx, { token });
    expect(result.redirectTo).toBe("/dashboard");

    const users = db.getAll("users");
    const updatedUser = users.find((user) => user._id === userId);
    expect(updatedUser?.verifiedAt).toBe(Date.now());

    vi.useRealTimers();
  });
});
