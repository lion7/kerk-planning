const dateRegex = /2[0-9]{3}-[01][0-9]-[0-3][0-9]/;

export function isoDateString(date: any) {
  let result: string;
  if (date instanceof Date) {
    date.setHours(12);
    result = date.toISOString().substring(0, 10);
  } else if (date instanceof Date2) {
    date.setHours(12);
    result = date.toISOString().substring(0, 10);
  } else {
    result = date.toString();
  }
  if (!dateRegex.test(result)) {
    throw new Error(`Date '${result}' should match ${dateRegex}`);
  }
  return result;
}
