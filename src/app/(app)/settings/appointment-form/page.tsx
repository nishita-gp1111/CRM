import { redirect } from "next/navigation";
import { AppointmentFormSettings } from "@/components/appointments/appointment-form-settings";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PageHeading } from "@/components/ui/page-heading";
import { getAuthContext } from "@/lib/auth";
import { getAccessibleBusinessUnits } from "@/lib/business-units";
import { hasPermission, Permission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AppointmentFormSettingsPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const canManage =
    hasPermission(context.membership.role, Permission.MANAGE_ORGANIZATION) ||
    hasPermission(context.membership.role, Permission.MANAGE_KPI);
  if (!canManage) redirect("/settings");
  const businessUnits = await getAccessibleBusinessUnits(context);
  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeading
        eyebrow="Internal appointment form"
        title="IS連携フォーム設定"
        description="事業部ごとに、IS連携フォームの項目・表示順・必須・保存先・公開バージョンを管理します。"
      />
      <SettingsNav />
      <AppointmentFormSettings businessUnits={businessUnits} />
    </div>
  );
}
