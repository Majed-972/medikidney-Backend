import { BadRequestException } from '@nestjs/common';

const TIME_ONLY_REGEX =
  /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d{1,3}))?)?$/;

const pad = (value: number, length = 2) =>
  value.toString().padStart(length, '0');

export const buildTimeOnlyDate = (
  hours: number,
  minutes: number,
  seconds = 0,
  milliseconds = 0,
) => new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds, milliseconds));

export const buildLocalTimeOnlyDate = (date = new Date()) =>
  buildTimeOnlyDate(
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );

export const parseDialysisTimeInput = (value: string, fieldName: string) => {
  const trimmedValue = value.trim();
  const timeMatch = TIME_ONLY_REGEX.exec(trimmedValue);

  if (timeMatch) {
    const [, hoursText, minutesText, secondsText, millisecondsText] = timeMatch;

    return buildTimeOnlyDate(
      Number(hoursText),
      Number(minutesText),
      secondsText ? Number(secondsText) : 0,
      millisecondsText ? Number(millisecondsText.padEnd(3, '0')) : 0,
    );
  }

  const parsedDate = new Date(trimmedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new BadRequestException(`Invalid ${fieldName}.`);
  }

  return buildTimeOnlyDate(
    parsedDate.getUTCHours(),
    parsedDate.getUTCMinutes(),
    parsedDate.getUTCSeconds(),
    parsedDate.getUTCMilliseconds(),
  );
};

export const formatDialysisTimeValue = (value?: Date | string | null) => {
  if (!value) {
    return null;
  }

  let dateValue: Date | null = value instanceof Date ? value : null;

  if (typeof value === 'string') {
    const timeMatch = TIME_ONLY_REGEX.exec(value.trim());
    if (timeMatch) {
      const [, hoursText, minutesText, secondsText, millisecondsText] =
        timeMatch;

      return `${hoursText}:${minutesText}:${secondsText ?? '00'}.${
        millisecondsText?.padEnd(3, '0') ?? '000'
      }`;
    }

    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
      dateValue = parsedDate;
    } else {
      return value;
    }
  }

  if (!dateValue) {
    return null;
  }

  return `${pad(dateValue.getUTCHours())}:${pad(dateValue.getUTCMinutes())}:${pad(
    dateValue.getUTCSeconds(),
  )}.${pad(dateValue.getUTCMilliseconds(), 3)}`;
};

export const serializeDialysisSessionTimes = <
  T extends {
    start_time?: Date | string | null;
    end_time?: Date | string | null;
  },
>(
  session: T,
) => ({
  ...session,
  start_time: formatDialysisTimeValue(session.start_time),
  end_time: formatDialysisTimeValue(session.end_time),
});
