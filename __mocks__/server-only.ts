// Mock for server-only package in Vitest test environment.
// The real server-only package throws when imported outside Next.js server context.
// This mock allows pure helper unit tests to import modules that use server-only.
export default {}
