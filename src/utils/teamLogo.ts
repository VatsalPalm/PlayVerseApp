/**
 * Extracts a valid team logo or image URI from a team or participant object.
 * Checks common property names across different backend API endpoints.
 */
export const getTeamLogoUri = (
  team?: any,
  fallbackTeam?: any
): string | null => {
  if (!team && !fallbackTeam) return null;

  const candidateFields = [
    "logo",
    "team_logo",
    "logo_url",
    "logoUrl",
    "image",
    "imageUrl",
    "teamLogo",
    "teamImage",
    "avatar",
    "avatarUrl",
    "team_details?.logo",
    "team_details?.logo_url",
    "team_details?.image",
  ];

  const getValue = (obj: any, key: string) => {
    if (!obj) return null;
    if (key.includes("?.")) {
      const parts = key.split("?.");
      return parts.reduce((acc, part) => (acc ? acc[part] : null), obj);
    }
    return obj[key];
  };

  for (const field of candidateFields) {
    const val = getValue(team, field);
    if (val && typeof val === "string" && val.trim().length > 0) {
      return val.trim();
    }
  }

  if (fallbackTeam) {
    for (const field of candidateFields) {
      const val = getValue(fallbackTeam, field);
      if (val && typeof val === "string" && val.trim().length > 0) {
        return val.trim();
      }
    }
  }

  return null;
};
