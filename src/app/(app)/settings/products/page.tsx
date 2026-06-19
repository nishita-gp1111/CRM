import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PageHeading } from "@/components/ui/page-heading";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProductSettingsPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  const products = await prisma.product.findMany({
    where: { organizationId: context.organization.id },
    include: {
      priceBookEntries: { orderBy: { createdAt: "desc" }, take: 1 },
      businessUnitProducts: { include: { businessUnit: { select: { name: true } } } },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeading
        eyebrow="Products"
        title="商品・価格マスタ"
        description="商品、事業部への紐付け、標準粗利を確認します。"
      />
      <SettingsNav />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <div key={product.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold">{product.name}</h2>
                <p className="mt-1 text-xs text-slate-500">{product.category ?? "未分類"}</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                {product.status}
              </span>
            </div>
            <p className="mt-4 text-2xl font-semibold">
              {Number(product.priceBookEntries[0]?.grossProfitAmount ?? 0).toLocaleString("ja-JP")}円
            </p>
            <p className="mt-3 text-xs text-slate-500">
              {product.businessUnitProducts
                .map((item) => item.businessUnit.name)
                .join(" / ")}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
