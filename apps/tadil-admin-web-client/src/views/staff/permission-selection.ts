export function addPageAccess(values: string[], available: string[]) {
  return [
    ...new Set(
      values.flatMap((value) => {
        const read = `${value.split('.')[0]}.read`;
        return available.includes(read) ? [read, value] : [value];
      })
    ),
  ];
}

export function removePermissions(
  values: string[],
  removed: string[],
  ensureRead = false
) {
  return values.filter(
    (value) =>
      !removed.includes(value) &&
      !(ensureRead && removed.includes(`${value.split('.')[0]}.read`))
  );
}
