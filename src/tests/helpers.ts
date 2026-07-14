import prisma from "../libs/prisma";

export async function clearDatabase(): Promise<void> {
  await prisma.deceased.deleteMany();
  await prisma.disease.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export function extractCookieValue(
  setCookieHeader: string | string[] | undefined,
  cookieName: string,
): string | undefined {
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const target = cookies.find((cookie) => cookie?.startsWith(`${cookieName}=`));
  if (!target) return undefined;
  const firstSegment = target.split(";")[0];
  if (!firstSegment) return undefined;
  return firstSegment.split("=")[1];
}