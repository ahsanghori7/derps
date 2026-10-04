import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(utc);
dayjs.extend(customParseFormat);
dayjs.extend(isBetween);

const parseWithFormats = (input, formats, strict, asUtc) => {
  const list = Array.isArray(formats) ? formats : [formats];
  for (const format of list) {
    const parsed = asUtc
      ? dayjs.utc(input, format, Boolean(strict))
      : dayjs(input, format, Boolean(strict));
    if (parsed.isValid()) return parsed;
  }
  return asUtc ? dayjs.utc(input) : dayjs(input);
};

function moment(input, format, strict) {
  if (input === undefined) return dayjs();
  if (format !== undefined) return parseWithFormats(input, format, strict, false);
  return dayjs(input);
}

moment.utc = (input, format, strict) => {
  if (input === undefined) return dayjs.utc();
  if (format !== undefined) return parseWithFormats(input, format, strict, true);
  return dayjs.utc(input);
};

export default moment;
