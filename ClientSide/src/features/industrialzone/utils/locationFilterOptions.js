const normalizeLocationValue = (value) => String(value || '').trim();

const splitLocationParts = (value) => (
  normalizeLocationValue(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
);

export const buildZoneLocationFilterOptions = (zones = []) => {
  const groupedOptions = new Map();

  zones.forEach((zone) => {
    const rawLocation = normalizeLocationValue(zone?.location);
    if (!rawLocation) {
      return;
    }

    const parts = splitLocationParts(rawLocation);
    const parent = parts.length > 1 ? parts[parts.length - 1] : "Khác";
    const child = parts.length > 2 ? parts[parts.length - 2] : parts[0];

    if (!groupedOptions.has(parent)) {
      groupedOptions.set(parent, new Set());
    }

    groupedOptions.get(parent).add(child);
  });

  return Array.from(groupedOptions.entries()).reduce((acc, [parent, children]) => {
    acc[parent] = Array.from(children).sort((left, right) => left.localeCompare(right, 'vi'));
    return acc;
  }, {});
};
