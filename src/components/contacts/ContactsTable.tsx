import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  MailQuestion,
  Tag as TagIcon,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/shared/Button";
import { SearchInput } from "@/components/shared/SearchInput";
import { Badge } from "@/components/shared/Badge";
import { Checkbox } from "@/components/shared/Checkbox";
import { EmptyState } from "@/components/shared/EmptyState";
import { useContactStore } from "@/stores/contactStore";
import { useUIStore, toast } from "@/stores/uiStore";
import { Modal } from "@/components/shared/Modal";
import { TagInput } from "@/components/shared/TagInput";
import type { ContactFilters } from "@/types";

const PAGE_SIZES = [25, 50, 100, 200];

export function ContactsTable() {
  const {
    rows,
    total,
    page,
    pageSize,
    loading,
    filters,
    setFilters,
    clearFilters,
    selection,
    toggleSelect,
    selectAll,
    clearSelection,
    load,
    clients,
    allTags,
    loadTags,
  } = useContactStore();

  const [search, setSearch] = useState(filters.search ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [newTags, setNewTags] = useState<string[]>([]);
  const openDetail = useUIStore((s) => s.openContactDetail);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters({ search, page: 1 });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    load();
  }, [filters, load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasSelection = selection.size > 0;

  const selectedIds = useMemo(() => Array.from(selection), [selection]);

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Delete ${selectedIds.length} contact(s)? This can't be undone.`)) return;
    try {
      await window.api.contacts.delete(selectedIds);
      toast({ title: "Contacts deleted", tone: "success" });
      clearSelection();
      load();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, tone: "error" });
    }
  };

  const applyTags = async (action: "add" | "remove") => {
    if (!newTags.length) return;
    try {
      await window.api.contacts.bulkTag(selectedIds, newTags, action);
      toast({
        title: action === "add" ? "Tags added" : "Tags removed",
        tone: "success",
      });
      setTagModalOpen(false);
      setNewTags([]);
      clearSelection();
      loadTags();
      load();
    } catch (err: any) {
      toast({ title: "Tag update failed", description: err.message, tone: "error" });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-3 border-b border-border flex items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search contacts, clients, roles…"
          className="w-[360px]"
        />
        <Button
          size="sm"
          variant={filtersOpen ? "primary" : "secondary"}
          icon={<Filter size={14} />}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          Filters
          {activeFilterCount(filters) > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded bg-bg text-[10px] text-fg">
              {activeFilterCount(filters)}
            </span>
          )}
        </Button>
        {activeFilterCount(filters) > 0 && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            Clear
          </Button>
        )}
        <div className="ml-auto text-xs text-fg-muted">
          {total.toLocaleString()} result{total === 1 ? "" : "s"}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {filtersOpen && (
          <FilterSidebar
            filters={filters}
            setFilters={setFilters}
            clients={clients}
            allTags={allTags}
            onClose={() => setFiltersOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {hasSelection && (
            <div className="px-6 h-11 border-b border-border bg-accent/5 flex items-center gap-3 text-sm">
              <span>{selection.size} selected</span>
              <Button
                size="sm"
                variant="secondary"
                icon={<TagIcon size={12} />}
                onClick={() => setTagModalOpen(true)}
              >
                Tag
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<Trash2 size={12} />}
                onClick={handleBulkDelete}
              >
                Delete
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={<X size={12} />}
                onClick={clearSelection}
                className="ml-auto"
              >
                Clear
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-bg">
                <tr className="border-b border-border">
                  <th className="w-10 px-4 py-2 text-left">
                    <Checkbox
                      checked={rows.length > 0 && rows.every((r) => selection.has(r.id))}
                      indeterminate={
                        selection.size > 0 &&
                        !rows.every((r) => selection.has(r.id))
                      }
                      onChange={() => {
                        if (rows.every((r) => selection.has(r.id))) {
                          clearSelection();
                        } else {
                          selectAll();
                        }
                      }}
                    />
                  </th>
                  <TH
                    label="Name"
                    sortKey="name"
                    filters={filters}
                    setFilters={setFilters}
                  />
                  <TH
                    label="Email"
                    sortKey="email"
                    filters={filters}
                    setFilters={setFilters}
                  />
                  <TH
                    label="Client"
                    sortKey="client"
                    filters={filters}
                    setFilters={setFilters}
                  />
                  <TH
                    label="Role"
                    sortKey="role"
                    filters={filters}
                    setFilters={setFilters}
                  />
                  <th className="px-4 py-2 text-left text-[11px] font-medium text-fg-muted uppercase tracking-wider">
                    Tags
                  </th>
                  <TH
                    label="Last Emailed"
                    sortKey="last_emailed"
                    filters={filters}
                    setFilters={setFilters}
                  />
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-fg-muted">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12">
                      <EmptyState
                        icon={Users}
                        title="No contacts"
                        description="Try adjusting your filters, or import a spreadsheet to get started."
                      />
                    </td>
                  </tr>
                ) : (
                  rows.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => openDetail(c.id)}
                      className={cn(
                        "border-b border-border hover:bg-bg-hover/60 cursor-pointer transition-colors",
                        selection.has(c.id) && "bg-accent/5"
                      )}
                    >
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selection.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-fg">{c.name}</td>
                      <td className="px-4 py-3 text-fg-muted font-mono text-[12px]">
                        {c.email}
                      </td>
                      <td className="px-4 py-3 text-fg">
                        {c.client_name ? (
                          c.client_name
                        ) : (
                          <span className="text-fg-subtle">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-fg-muted">
                        {c.role || <span className="text-fg-subtle">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {c.tags.slice(0, 4).map((t) => (
                            <Badge key={t}>{t}</Badge>
                          ))}
                          {c.tags.length > 4 && (
                            <Badge tone="muted">+{c.tags.length - 4}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-fg-muted">
                        {c.last_emailed_at ? (
                          formatDate(c.last_emailed_at)
                        ) : (
                          <span className="inline-flex items-center gap-1 text-fg-subtle">
                            <MailQuestion size={11} /> Never
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="h-11 shrink-0 border-t border-border px-6 flex items-center gap-3 text-xs text-fg-muted">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) =>
                  setFilters({ pageSize: Number(e.target.value), page: 1 })
                }
                className="h-7 px-2 bg-bg-subtle border border-border rounded text-xs text-fg"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
              <div className="flex">
                <button
                  className="h-7 px-2.5 border border-border rounded-l-md disabled:opacity-40 hover:bg-bg-hover"
                  disabled={page <= 1}
                  onClick={() => setFilters({ page: page - 1 })}
                >
                  Prev
                </button>
                <button
                  className="h-7 px-2.5 border border-l-0 border-border rounded-r-md disabled:opacity-40 hover:bg-bg-hover"
                  disabled={page >= totalPages}
                  onClick={() => setFilters({ page: page + 1 })}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={tagModalOpen}
        onClose={() => setTagModalOpen(false)}
        title="Manage tags"
        description={`Modifying ${selection.size} contact(s)`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTagModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => applyTags("remove")}>
              Remove
            </Button>
            <Button variant="primary" onClick={() => applyTags("add")}>
              Add
            </Button>
          </>
        }
      >
        <TagInput
          value={newTags}
          onChange={setNewTags}
          suggestions={allTags}
          placeholder="Type tags and press Enter…"
        />
      </Modal>
    </div>
  );
}

function TH({
  label,
  sortKey,
  filters,
  setFilters,
}: {
  label: string;
  sortKey: NonNullable<ContactFilters["sortBy"]>;
  filters: ContactFilters;
  setFilters: (f: Partial<ContactFilters>) => void;
}) {
  const active = filters.sortBy === sortKey;
  const dir = filters.sortDir ?? "asc";
  return (
    <th
      className="px-4 py-2 text-left text-[11px] font-medium text-fg-muted uppercase tracking-wider cursor-pointer select-none"
      onClick={() => {
        if (!active) {
          setFilters({ sortBy: sortKey, sortDir: "asc" });
        } else {
          setFilters({ sortDir: dir === "asc" ? "desc" : "asc" });
        }
      }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active &&
          (dir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
      </span>
    </th>
  );
}

function activeFilterCount(f: ContactFilters): number {
  let n = 0;
  if (f.client_ids?.length) n++;
  if (f.tags?.length) n++;
  if (typeof f.is_active === "boolean") n++;
  if (f.emailed) n++;
  return n;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function FilterSidebar({
  filters,
  setFilters,
  clients,
  allTags,
  onClose,
}: {
  filters: ContactFilters;
  setFilters: (f: Partial<ContactFilters>) => void;
  clients: Array<{ id: number; name: string; contact_count: number }>;
  allTags: string[];
  onClose: () => void;
}) {
  return (
    <aside className="w-72 shrink-0 border-r border-border p-4 overflow-y-auto bg-bg-elevated">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Filters
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded text-fg-subtle hover:text-fg"
        >
          <X size={12} />
        </button>
      </div>

      <FilterGroup title="Status">
        <select
          value={
            filters.is_active === undefined
              ? "all"
              : filters.is_active
                ? "active"
                : "inactive"
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === "all") setFilters({ is_active: undefined });
            else setFilters({ is_active: v === "active" });
          }}
          className="w-full h-8 bg-bg-subtle border border-border rounded text-sm px-2"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </FilterGroup>

      <FilterGroup title="Last emailed">
        <select
          value={filters.emailed ?? ""}
          onChange={(e) =>
            setFilters({
              emailed: (e.target.value || undefined) as ContactFilters["emailed"],
            })
          }
          className="w-full h-8 bg-bg-subtle border border-border rounded text-sm px-2"
        >
          <option value="">Any time</option>
          <option value="never">Never emailed</option>
          <option value="recent">Last 30 days</option>
          <option value="stale">No contact in 90+ days</option>
        </select>
      </FilterGroup>

      <FilterGroup title="Clients">
        <div className="max-h-48 overflow-y-auto -mx-1">
          {clients.map((c) => {
            const checked = !!filters.client_ids?.includes(c.id);
            return (
              <label
                key={c.id}
                className="flex items-center gap-2 px-1 py-1 text-sm hover:bg-bg-hover rounded cursor-pointer"
              >
                <Checkbox
                  checked={checked}
                  onChange={() => {
                    const set = new Set(filters.client_ids ?? []);
                    if (checked) set.delete(c.id);
                    else set.add(c.id);
                    setFilters({ client_ids: Array.from(set) });
                  }}
                />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-[11px] text-fg-subtle tabular-nums">
                  {c.contact_count}
                </span>
              </label>
            );
          })}
          {clients.length === 0 && (
            <div className="text-xs text-fg-muted px-1">No clients yet</div>
          )}
        </div>
      </FilterGroup>

      <FilterGroup title="Tags">
        <div className="flex flex-wrap gap-1">
          {allTags.map((t) => {
            const active = filters.tags?.includes(t);
            return (
              <button
                key={t}
                onClick={() => {
                  const set = new Set(filters.tags ?? []);
                  if (active) set.delete(t);
                  else set.add(t);
                  setFilters({ tags: Array.from(set) });
                }}
                className={cn(
                  "px-2 h-6 text-[11px] rounded border transition-colors",
                  active
                    ? "bg-accent/15 text-accent border-accent/40"
                    : "bg-bg-subtle border-border text-fg-muted hover:text-fg"
                )}
              >
                {t}
              </button>
            );
          })}
          {allTags.length === 0 && (
            <div className="text-xs text-fg-muted">No tags yet</div>
          )}
        </div>
      </FilterGroup>
    </aside>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle mb-1.5">
        {title}
      </div>
      {children}
    </div>
  );
}
