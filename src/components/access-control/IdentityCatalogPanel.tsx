import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deriveRole, type AppRole } from "@/context/AuthContext";

type CategoryItem = {
  id: string;
  code: string;
  name?: string;
};

type GroupItem = {
  id: string;
  code: string;
  name?: string;
  category?: { code?: string; name?: string };
};

const roleTone: Record<AppRole, string> = {
  SUPER_ADMIN: "bg-rose-50 text-rose-700 border-rose-200",
  ADMIN: "bg-amber-50 text-amber-700 border-amber-200",
  PROVIDER: "bg-sky-50 text-sky-700 border-sky-200",
  CONSUMER: "bg-emerald-50 text-emerald-700 border-emerald-200",
  VIEWER: "bg-slate-50 text-slate-700 border-slate-200",
  AUDITOR: "bg-violet-50 text-violet-700 border-violet-200",
  GIS_ANALYST: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

export interface IdentityCatalogPanelProps {
  categories: CategoryItem[];
  groups: GroupItem[];
}

export const IdentityCatalogPanel = ({ categories, groups }: IdentityCatalogPanelProps) => {
  const groupsByCategoryId = categories.reduce<Record<string, GroupItem[]>>((acc, category) => {
    acc[category.id] = groups.filter((group) => group.category?.code === category.code);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Card className="panel border-slate-200/80 bg-gradient-to-br from-white via-white to-sky-50/40">
        <CardHeader>
          <CardTitle>Katalog Identitas</CardTitle>
          <CardDescription>
            Halaman ini merangkum category dan group yang benar-benar dikirim CTS saat ini. Di API aktif, category dan group masih terbuka sebagai katalog baca, belum CRUD penuh.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Category</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{categories.length}</p>
            <p className="mt-1 text-sm text-slate-600">Sumber klasifikasi user dari CTS.</p>
          </div>
          <div className="rounded-2xl border bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Group</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{groups.length}</p>
            <p className="mt-1 text-sm text-slate-600">Kelompok akses yang menjadi dasar matrix permission.</p>
          </div>
          <div className="rounded-2xl border bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Catatan API</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">Catalog only</p>
            <p className="mt-1 text-sm text-slate-600">CRUD category/group belum terlihat di kontrak API aktif, jadi pengelolaan detailnya masih perlu dukungan backend.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
        <Card className="panel">
          <CardHeader>
            <CardTitle>Category Aktif</CardTitle>
            <CardDescription>Ini daftar kategori user yang dipakai saat create user dan saat JWT dibaca ulang di login.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                Category belum terbaca dari CTS.
              </div>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{category.name || category.code}</p>
                    <Badge variant="outline">{category.code}</Badge>
                    <Badge variant="secondary">{groupsByCategoryId[category.id]?.length ?? 0} group</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Dipakai untuk mengelompokkan user sebelum group dan permission granular diterapkan.
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="panel">
          <CardHeader>
            <CardTitle>Group dan Role Turunan</CardTitle>
            <CardDescription>Role aplikasi saat ini masih diturunkan dari kombinasi category code dan group code. Tabel ini membantu lihat hasil mapping-nya dengan jelas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {groups.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">
                Group belum terbaca dari CTS.
              </div>
            ) : (
              groups.map((group) => {
                const categoryCode = group.category?.code ?? "";
                const mappedRole = deriveRole(categoryCode, group.code);
                return (
                  <div key={group.id} className="rounded-2xl border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{group.name || group.code}</p>
                      <Badge variant="outline">{group.code}</Badge>
                      <Badge className={roleTone[mappedRole]}>{mappedRole}</Badge>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Category induk</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">{group.category?.name || categoryCode || "-"}</p>
                        <p className="mt-1 text-xs text-slate-500">{categoryCode || "Belum ada category pada payload group"}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Role aplikasi</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">{mappedRole}</p>
                        <p className="mt-1 text-xs text-slate-500">Hasil derive dari category/group yang sekarang dipakai halaman, sidebar, dan route guard.</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
