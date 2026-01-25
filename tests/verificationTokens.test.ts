import type { MutationCtx } from "convex/server";
import { describe, expect, it, vi } from "vitest";
import {
  consumeVerificationTokenHandler,
  createVerificationTokenHandler,
} from "../convex/verificationTokens";

type TokenDoc = {
  _id: string;
  token: string;
  phone: string;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
};

type QueryField = "token" | "phone";

class FakeQuery {
  private field: QueryField | null = null;
  private value: string | null = null;

  constructor(private readonly store: TokenDoc[]) {}

  withIndex(_name: string, builder: (q: FakeQuery) => FakeQuery) {
    return builder(this);
  }

  eq(field: QueryField, value: string) {
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
  private store: TokenDoc[] = [];
  private idCounter = 0;

  query(_table: "verification_tokens") {
    void _table;
    return new FakeQuery(this.store);
  }

  async insert(_table: "verification_tokens", doc: Omit<TokenDoc, "_id">) {
    void _table;
    const _id = `token_${this.idCounter++}`;
    this.store.push({ _id, ...doc });
    return _id;
  }

  async patch(id: string, patch: Partial<TokenDoc>) {
    const idx = this.store.findIndex((doc) => doc._id === id);
    if (idx === -1) {
      throw new Error("Doc not found");
    }
    this.store[idx] = { ...this.store[idx], ...patch };
  }

  getAll() {
    return this.store;
  }
}

function makeCtx() {
  return { db: new FakeDb() } as const;
}

describe("verification tokens", () => {
  it("creates and consumes a token successfully", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-25T10:00:00Z"));

    const ctx = makeCtx() as unknown as MutationCtx;
    const { token } = await createVerificationTokenHandler(ctx, {
      phone: "+85251234567",
    });

    const result = await consumeVerificationTokenHandler(ctx, { token });
    expect(result.phone).toBe("+85251234567");

    vi.useRealTimers();
  });

  it("rejects a reused token", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-25T10:00:00Z"));

    const ctx = makeCtx() as unknown as MutationCtx;
    const { token } = await createVerificationTokenHandler(ctx, {
      phone: "+85251234567",
    });

    await consumeVerificationTokenHandler(ctx, { token });

    await expect(
      consumeVerificationTokenHandler(ctx, { token }),
    ).rejects.toThrow("Token already used.");

    vi.useRealTimers();
  });

  it("rejects an expired token", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-25T10:00:00Z"));

    const ctx = makeCtx() as unknown as MutationCtx;
    const { token } = await createVerificationTokenHandler(ctx, {
      phone: "+85251234567",
    });

    vi.setSystemTime(new Date("2026-01-25T10:10:01Z"));

    await expect(
      consumeVerificationTokenHandler(ctx, { token }),
    ).rejects.toThrow("Token expired.");

    vi.useRealTimers();
  });

  it("invalidates previous tokens on create", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-25T10:00:00Z"));

    const ctx = makeCtx() as unknown as MutationCtx;
    const first = await createVerificationTokenHandler(ctx, {
      phone: "+85251234567",
    });

    vi.setSystemTime(new Date("2026-01-25T10:01:00Z"));

    const second = await createVerificationTokenHandler(ctx, {
      phone: "+85251234567",
    });

    await expect(
      consumeVerificationTokenHandler(ctx, { token: first.token }),
    ).rejects.toThrow("Token already used.");

    const result = await consumeVerificationTokenHandler(ctx, {
      token: second.token,
    });
    expect(result.phone).toBe("+85251234567");

    vi.useRealTimers();
  });
});
