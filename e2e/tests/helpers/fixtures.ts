export const VALID_TEST_PASSWORD = 'Test1234!';

export function uniqueTestEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@mail.austral.edu.ar`;
}
