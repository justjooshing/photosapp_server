import { prisma } from "@/loaders/prisma.js";

interface RefreshTokenProps {
  email: string;
}

export const getRefreshToken = async ({ email }: RefreshTokenProps) => {
  const { refresh_token } = await prisma.refresh_token.findUniqueOrThrow({
    where: { email },
    select: { refresh_token: true },
  });
  return refresh_token;
};

interface UpdateRefreshTokenProps extends RefreshTokenProps {
  refresh_token: string;
}

export const updateRefeshToken = async ({
  email,
  refresh_token,
}: UpdateRefreshTokenProps) => {
  const existing = await prisma.refresh_token.findUnique({ where: { email } });
  if (existing) {
    return await prisma.refresh_token.update({
      where: {
        email,
      },
      data: { refresh_token },
    });
  }
  return await prisma.refresh_token.create({
    data: { email, refresh_token },
  });
};
