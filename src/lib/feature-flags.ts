import { OrganizationRole } from "@prisma/client";

export function isLegacyExcelImportEnabled() {
  return process.env.LEGACY_EXCEL_IMPORT_ENABLED === "true";
}

export function canUseLegacyProgressImport(role: OrganizationRole) {
  return role === "SUPER_ADMIN" || role === "ADMIN";
}
