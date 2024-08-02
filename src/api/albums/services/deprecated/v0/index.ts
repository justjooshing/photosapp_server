import { prisma } from "@/loaders/prisma.js";
import { ApiAlbum } from "../../types.js";
import { SortOptions } from "@/api/images/types.js";

export const deprecated_findAlbums = async (
  userId: number,
): Promise<ApiAlbum[]> => {
  const albums = await prisma.album.findMany({
    orderBy: {
      created_at: "desc",
    },
    where: {
      userId,
      images: {
        some: {
          NOT: {
            actually_deleted: {
              not: null,
            },
          },
        },
      },
    },
  });

  // Get counts sorted_statuses groupedBy albumId
  const counts = await prisma.images.groupBy({
    by: ["sorted_album_id", "sorted_status"],
    where: {
      sorted_album_id: {
        in: albums.map(({ id }) => id),
      },
      actually_deleted: null,
    },
    _count: {
      sorted_status: true,
    },
  });

  // Map each count to respective albums
  const albumCounts = new Map();
  counts.forEach(
    ({ _count: { sorted_status: count }, sorted_album_id, sorted_status }) => {
      if (!albumCounts.has(sorted_album_id)) {
        albumCounts.set(sorted_album_id, { keepCount: 0, deleteCount: 0 });
      }
      const albumCount = albumCounts.get(sorted_album_id);
      const type =
        sorted_status === SortOptions.KEEP ? "keepCount" : "deleteCount";
      albumCount[type] = count;
    },
  );

  return albums.map((album) => ({
    ...album,
    ...albumCounts.get(album.id),
  }));
};
