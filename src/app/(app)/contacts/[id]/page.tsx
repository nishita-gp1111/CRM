import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ContactDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const { id } = await params;
  const link = await prisma.objectAssociation.findFirst({
    where: {
      organizationId: context.organization.id,
      OR: [
        {
          sourceObjectType: "CONTACT",
          sourceObjectId: id,
          targetObjectType: "COMPANY",
        },
        {
          sourceObjectType: "COMPANY",
          targetObjectType: "CONTACT",
          targetObjectId: id,
        },
      ],
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
  });
  if (!link) redirect("/companies");
  const companyId =
    link.sourceObjectType === "COMPANY"
      ? link.sourceObjectId
      : link.targetObjectId;
  redirect(`/companies/${companyId}`);
}
