export const resolveManagerZoneLabel = ({
  zoneName,
  zoneId,
  zones = [],
  fallback = 'KCN được phân công',
} = {}) => {
  const normalizedZoneId = String(zoneId || '').trim();
  if (zoneName) return zoneName;

  if (normalizedZoneId && Array.isArray(zones)) {
    const matchedZone = zones.find(
      (zone) => String(zone?.zone_id || '').trim() === normalizedZoneId,
    );
    if (matchedZone?.zone_name) return matchedZone.zone_name;
  }

  return normalizedZoneId || fallback;
};

export const buildManagerScopedTitle = (title, zoneLabel) =>
  zoneLabel ? `${title} | ${zoneLabel}` : title;
