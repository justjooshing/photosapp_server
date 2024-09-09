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
}: UpdateRefreshTokenProps) =>
  prisma.refresh_token.upsert({
    where: {
      email,
    },
    create: {
      email,
      refresh_token,
    },
    update: {
      refresh_token,
    },
  });
