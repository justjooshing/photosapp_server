import { Filters } from "..//services/images/types.ts";

export const todayFilter = (): Filters => {
  const currentDate = new Date();

  return {
    dateFilter: {
      dates: [
        {
          year: 0,
          day: currentDate.getDate(),
          month: currentDate.getMonth() + 1, // month starts from 0
        },
      ],
    },
  };
};

export const newestImagesFilter = (lastUpdated: Date): Filters => {
  const currentDate = new Date();
  return {
    dateFilter: {
      ranges: [
        {
          endDate: {
            day: currentDate.getDate(),
            month: currentDate.getMonth() + 1, // month starts from 0
            year: currentDate.getFullYear(),
          },
          startDate: {
            day: lastUpdated.getDate(),
            month: lastUpdated.getMonth() + 1,
            year: lastUpdated.getFullYear(),
          },
        },
      ],
    },
  };
};
