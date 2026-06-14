"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, Clock, ImageOff, FolderPlus, Search, X, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { tx, formatMoney, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/misc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  saveCategory,
  deleteCategory,
  saveDish,
  deleteDish,
  toggleDishAvailability,
  uploadDishImage,
} from "./actions";

type Cat = { id: string; name: Record<string, string>; sortOrder: number };
type RecipeRow = { ingredientId: string; qty: number };
type Ing = { id: string; name: Record<string, string>; unit: string };
type Dish = {
  id: string;
  categoryId: string;
  name: Record<string, string>;
  description: Record<string, string> | null;
  price: number;
  prepTimeMin: number;
  imageUrl: string | null;
  isAvailable: boolean;
  recipe: RecipeRow[];
};

export function MenuManager({
  categories,
  dishes,
  ingredients,
}: {
  categories: Cat[];
  dishes: Dish[];
  ingredients: Ing[];
}) {
  const t = useTranslations("menu");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [, startTransition] = useTransition();

  const [activeCat, setActiveCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [dishDialog, setDishDialog] = useState<Dish | "new" | null>(null);
  const [catDialog, setCatDialog] = useState<Cat | "new" | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dishes.filter((d) => {
      if (activeCat !== "all" && d.categoryId !== activeCat) return false;
      if (q && !tx(d.name, locale).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [dishes, activeCat, query, locale]);

  function run(fn: () => Promise<void>, ok = tc("saved")) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(ok);
      } catch (e) {
        if (e instanceof Error && e.message === "HAS_ORDERS") {
          toast.error(t("deleteHasOrders"));
          return;
        }
        toast.error(tc("error"));
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveCat("all")}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            activeCat === "all" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent",
          )}
        >
          {tc("all")}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCat(c.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              activeCat === c.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent",
            )}
          >
            {tx(c.name, locale)}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tc("search")}
              className="h-9 w-40 pl-8 sm:w-52"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setCatDialog("new")}>
            <FolderPlus className="h-4 w-4" /> {t("addCategory")}
          </Button>
          <Button size="sm" onClick={() => setDishDialog("new")} disabled={categories.length === 0}>
            <Plus className="h-4 w-4" /> {t("addDish")}
          </Button>
        </div>
      </div>

      {/* category chips manage (edit/delete) */}
      {activeCat !== "all" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {(() => {
            const c = categories.find((x) => x.id === activeCat);
            if (!c) return null;
            return (
              <>
                <span>{t("category")}: <b className="text-foreground">{tx(c.name, locale)}</b></span>
                <Button variant="ghost" size="sm" onClick={() => setCatDialog(c)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => run(() => deleteCategory(c.id), tc("deleted"))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            );
          })()}
        </div>
      )}

      {/* dish grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((d) => (
          <Card key={d.id} className="group overflow-hidden">
            <div className="relative aspect-[4/3] bg-muted">
              {d.imageUrl ? (
                <Image src={d.imageUrl} alt={tx(d.name, locale)} fill className="object-cover" sizes="240px" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImageOff className="h-8 w-8" />
                </div>
              )}
              {!d.isAvailable && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Badge variant="destructive">{t("unavailable")}</Badge>
                </div>
              )}
            </div>
            <div className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-1">
                <h3 className="line-clamp-1 font-semibold">{tx(d.name, locale)}</h3>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary">{formatMoney(d.price)}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {d.prepTimeMin} {t("prepTime").includes("min") ? "min" : "daq"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <Switch
                  checked={d.isAvailable}
                  onCheckedChange={(v) => run(() => toggleDishAvailability(d.id, v))}
                />
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDishDialog(d)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => {
                      if (confirm(t("deleteConfirm"))) run(() => deleteDish(d.id), tc("deleted"));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-12 text-center text-muted-foreground">{tc("noData")}</p>
        )}
      </div>

      {dishDialog && (
        <DishDialog
          dish={dishDialog === "new" ? null : dishDialog}
          categories={categories}
          ingredients={ingredients}
          defaultCat={activeCat !== "all" ? activeCat : categories[0]?.id}
          onClose={() => setDishDialog(null)}
          onSave={(data) => run(() => saveDish(data))}
        />
      )}
      {catDialog && (
        <CategoryDialog
          cat={catDialog === "new" ? null : catDialog}
          onClose={() => setCatDialog(null)}
          onSave={(data) => run(() => saveCategory(data))}
        />
      )}
    </div>
  );
}

/* ===== Dish dialog ===== */
function DishDialog({
  dish,
  categories,
  ingredients,
  defaultCat,
  onClose,
  onSave,
}: {
  dish: Dish | null;
  categories: Cat[];
  ingredients: Ing[];
  defaultCat?: string;
  onClose: () => void;
  onSave: (d: Parameters<typeof saveDish>[0]) => void;
}) {
  const t = useTranslations("menu");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [name, setName] = useState({ uz: dish?.name.uz ?? "", ru: dish?.name.ru ?? "", en: dish?.name.en ?? "" });
  const [desc, setDesc] = useState({
    uz: dish?.description?.uz ?? "",
    ru: dish?.description?.ru ?? "",
    en: dish?.description?.en ?? "",
  });
  const [price, setPrice] = useState(String(dish?.price ?? ""));
  const [prep, setPrep] = useState(String(dish?.prepTimeMin ?? 10));
  const [img, setImg] = useState(dish?.imageUrl ?? "");
  const [cat, setCat] = useState(dish?.categoryId ?? defaultCat ?? "");
  const [available, setAvailable] = useState(dish?.isAvailable ?? true);
  const [recipe, setRecipe] = useState<RecipeRow[]>(dish?.recipe ?? []);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const url = await uploadDishImage(formData);
      setImg(url);
    } catch {
      toast.error(tc("error"));
    } finally {
      setUploading(false);
    }
  }

  const ingName = (id: string) => {
    const i = ingredients.find((x) => x.id === id);
    return i ? `${tx(i.name, locale)} (${i.unit})` : "";
  };
  const addRow = () => {
    setRecipe([...recipe, { ingredientId: "", qty: 0 }]);
  };
  const setRow = (idx: number, patch: Partial<RecipeRow>) =>
    setRecipe(recipe.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeRow = (idx: number) => setRecipe(recipe.filter((_, i) => i !== idx));

  function submit() {
    onSave({
      id: dish?.id,
      categoryId: cat,
      name,
      description: desc,
      price,
      prepTimeMin: prep,
      imageUrl: img,
      isAvailable: available,
      recipe: recipe.filter((r) => r.ingredientId && Number(r.qty) > 0),
    });
    onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{dish ? t("editDish") : t("addDish")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-2">
            <Field label={t("nameUz")} value={name.uz} onChange={(v) => setName({ ...name, uz: v })} />
            <Field label={t("nameRu")} value={name.ru} onChange={(v) => setName({ ...name, ru: v })} />
            <Field label={t("nameEn")} value={name.en} onChange={(v) => setName({ ...name, en: v })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>{t("category")}</Label>
              <Select value={cat} onValueChange={setCat}>
                <SelectTrigger>
                  <SelectValue placeholder={t("category")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {tx(c.name, "uz")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field label={t("price")} type="number" value={price} onChange={setPrice} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("prepTime")} type="number" value={prep} onChange={setPrep} />
            <div className="space-y-1.5">
              <Label>{t("image")}</Label>
              <div className="flex items-center gap-2">
                {img ? (
                  <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-muted">
                    <Image src={img} alt="" fill className="object-cover" sizes="48px" />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                    <ImageOff className="h-5 w-5" />
                  </div>
                )}
                <label className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-input text-sm hover:bg-accent">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {t("uploadImage")}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("description")} (UZ)</Label>
            <Textarea value={desc.uz} onChange={(e) => setDesc({ ...desc, uz: e.target.value })} />
          </div>

          {/* Recipe (ingredients) */}
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">{t("recipe")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
                disabled={ingredients.length === 0}
              >
                <Plus className="h-4 w-4" /> {t("addRow")}
              </Button>
            </div>
            {recipe.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("recipeHint")}</p>
            ) : (
              recipe.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={r.ingredientId}
                    onChange={(e) => setRow(idx, { ingredientId: e.target.value })}
                    className="border-input flex h-9 flex-1 rounded-md border bg-transparent px-2 text-sm"
                  >
                    <option value="">{t("selectIngredient")}</option>
                    {ingredients
                      .filter((i) => i.id === r.ingredientId || !recipe.some((row) => row.ingredientId === i.id))
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {ingName(i.id)}
                        </option>
                      ))}
                  </select>
                  <Input
                    type="number"
                    step="0.001"
                    value={String(r.qty)}
                    onChange={(e) => setRow(idx, { qty: Number(e.target.value) })}
                    className="h-9 w-24"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive"
                    onClick={() => removeRow(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Switch checked={available} onCheckedChange={setAvailable} /> {t("available")}
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button onClick={submit} disabled={!name.uz || !cat || !price || uploading}>{tc("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===== Category dialog ===== */
function CategoryDialog({
  cat,
  onClose,
  onSave,
}: {
  cat: Cat | null;
  onClose: () => void;
  onSave: (c: Parameters<typeof saveCategory>[0]) => void;
}) {
  const t = useTranslations("menu");
  const tc = useTranslations("common");
  const [name, setName] = useState({ uz: cat?.name.uz ?? "", ru: cat?.name.ru ?? "", en: cat?.name.en ?? "" });
  const [sort, setSort] = useState(String(cat?.sortOrder ?? 0));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cat ? t("editCategory") : t("addCategory")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label={t("nameUz")} value={name.uz} onChange={(v) => setName({ ...name, uz: v })} />
          <Field label={t("nameRu")} value={name.ru} onChange={(v) => setName({ ...name, ru: v })} />
          <Field label={t("nameEn")} value={name.en} onChange={(v) => setName({ ...name, en: v })} />
          <Field label="Sort" type="number" value={sort} onChange={setSort} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button
            onClick={() => {
              onSave({ id: cat?.id, name, sortOrder: sort });
              onClose();
            }}
            disabled={!name.uz || !name.ru || !name.en}
          >
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
