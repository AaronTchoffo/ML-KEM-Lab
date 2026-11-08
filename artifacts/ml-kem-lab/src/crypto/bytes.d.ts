export function concat(...items: Uint8Array[]): Uint8Array;
export function hex(bytes: Uint8Array): string;
export function same(a: Uint8Array, b: Uint8Array): boolean;
export function randomBytes(length: number): Uint8Array;
export function copyText(text: string): Promise<boolean>;
