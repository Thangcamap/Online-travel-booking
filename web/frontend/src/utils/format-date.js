import { format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { vi } from "date-fns/locale";

export const formatDate = (utcDate, formatString = "dd MMMM yyyy HH:mm") => {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDate = toZonedTime(utcDate, userTimeZone);
  return format(localDate, formatString, { locale: vi });
};

export const toUTC = (localDate, formatString = "yyyy-MM-dd'T'HH:mm:ss'Z'") => {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const utcDate = fromZonedTime(localDate, userTimeZone);

  return format(utcDate, formatString);
};
