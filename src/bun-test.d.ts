// Minimal ambient types for `bun:test` so test files typecheck under the
// project tsconfig (which includes src/ but does not depend on bun-types).
// ponytail: stopgap covering only the API the tests use — remove this file
// once `bun-types` is added as a devDependency.
declare module "bun:test" {
    export type TestFn = () => void | Promise<void>;

    export interface Mock<T extends (...args: any[]) => any> {
        (...args: Parameters<T>): ReturnType<T>;
        mock: {
            calls: any[][];
            results: unknown[];
            instances: unknown[];
        };
    }

    export function mock<T extends (...args: any[]) => any>(fn: T): Mock<T>;

    export function test(name: string, fn: TestFn): void;
    export function describe(name: string, fn: () => void): void;
    export function afterEach(fn: () => void | Promise<void>): void;

    export interface Expect<T> {
        not: Expect<T>;
        toBe(expected: unknown): void;
        toEqual(expected: unknown): void;
        toStrictEqual(expected: unknown): void;
        toBeNull(): void;
        toBeUndefined(): void;
        toBeDefined(): void;
        toHaveLength(length: number): void;
        toContain(item: unknown): void;
        toBeInstanceOf(ctor: new (...args: any[]) => unknown): void;
        readonly rejects: AsyncExpect<T>;
        readonly resolves: AsyncExpect<T>;
    }

    export interface AsyncExpect<T> {
        toBe(expected: unknown): Promise<void>;
        toEqual(expected: unknown): Promise<void>;
        toBeNull(): Promise<void>;
        toBeUndefined(): Promise<void>;
        toHaveLength(length: number): Promise<void>;
        toContain(item: unknown): Promise<void>;
        toBeInstanceOf(ctor: new (...args: any[]) => unknown): Promise<void>;
    }

    export function expect<T>(value: T): Expect<T>;
}
