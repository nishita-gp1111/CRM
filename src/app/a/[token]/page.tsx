import { notFound } from "next/navigation";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { PageHeading } from "@/components/ui/page-heading";
import { getPublishedInternalAppointmentFormConfig } from "@/lib/appointment-form-config";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/security";

type Props = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export default async function PublicAppointmentCapturePage({ params }: Props) {
  const { token } = await params;
  const link = await prisma.appointmentCaptureLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { organization: { select: { id: true, name: true, slug: true } } },
  });
  if (!link || link.status !== "ACTIVE" || (link.expiresAt && link.expiresAt <= new Date())) notFound();
  const [businessUnit, setter, config, products, industries, territories] = await Promise.all([
    prisma.businessUnit.findFirst({
      where: { id: link.businessUnitId, organizationId: link.organizationId, status: "ACTIVE" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.user.findUnique({
      where: { id: link.creditedAppointmentSetterId },
      select: { id: true, name: true },
    }),
    getPublishedInternalAppointmentFormConfig(prisma, {
      organizationId: link.organizationId,
      businessUnitId: link.businessUnitId,
      userId: link.creditedAppointmentSetterId,
    }),
    prisma.product.findMany({
      where: { organizationId: link.organizationId, status: "ACTIVE" },
      select: { id: true, name: true, businessUnitProducts: { select: { businessUnitId: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.industry.findMany({
      where: { organizationId: link.organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
    prisma.salesTerritory.findMany({
      where: {
        organizationId: link.organizationId,
        isActive: true,
        OR: [{ businessUnitId: link.businessUnitId }, { businessUnitId: null }],
      },
      select: { id: true, name: true, businessUnitId: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  if (!businessUnit || !setter) notFound();
  const publicSchema = {
    ...config.schema,
    fields: config.schema.fields.map((field) =>
      ["businessUnitId", "appointmentSetterUserId", "assignedFsUserId", "companyId", "callListId", "campaignId"].includes(field.fieldKey)
        ? {
            ...field,
            isVisible: false,
            defaultValue:
              field.fieldKey === "businessUnitId"
                ? link.businessUnitId
                : field.fieldKey === "appointmentSetterUserId"
                  ? link.creditedAppointmentSetterId
                  : field.defaultValue ?? "",
          }
        : field,
    ),
  };
  return (
    <main className="min-h-screen bg-app px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <PageHeading
          eyebrow={link.organization.name}
          title={link.name}
          description="必要事項を入力してアポイント情報を送信してください。"
        />
        <AppointmentForm
          businessUnits={[businessUnit]}
          selectedBusinessUnitId={businessUnit.id}
          currentUserId={setter.id}
          users={[{ ...setter, businessUnitId: businessUnit.id }]}
          fsUsers={[]}
          products={products.map((product) => ({
            id: product.id,
            name: product.name,
            businessUnitIds: product.businessUnitProducts.map((item) => item.businessUnitId),
          }))}
          industries={industries}
          territories={territories}
          campaigns={[]}
          callLists={[]}
          companies={[]}
          formConfigs={[{ businessUnitId: businessUnit.id, formVersionId: config.version.id, schema: publicSchema }]}
          submitEndpoint={`/api/public/appointments/${token}`}
          passcodeRequired={Boolean(link.passcodeHash)}
        />
      </div>
    </main>
  );
}
