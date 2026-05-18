import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Modal } from "./Modal";
import { useUIStore, type ViewId } from "@/stores/uiStore";
import { useContactStore } from "@/stores/contactStore";
import { useTemplateStore } from "@/stores/templateStore";
import { useCampaignStore } from "@/stores/campaignStore";

type Item = {
  id: string;
  label: string;
  group: string;
  run: () => void;
};

export function CommandPalette() {
  const open = useUIStore((s) => s.commandOpen);
  const close = useUIStore((s) => s.closeCommand);
  const setActiveView = useUIStore((s) => s.setActiveView);
  const openContactDetail = useUIStore((s) => s.openContactDetail);
  const openTemplateEditor = useUIStore((s) => s.openTemplateEditor);
  const openCampaignDetail = useUIStore((s) => s.openCampaignDetail);

  const contacts = useContactStore((s) => s.rows);
  const templates = useTemplateStore((s) => s.templates);
  const campaigns = useCampaignStore((s) => s.campaigns);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const navigate = (v: ViewId, label: string): Item => ({
      id: `nav-${v}`,
      label,
      group: "Navigation",
      run: () => {
        setActiveView(v);
        close();
      },
    });
    const list: Item[] = [
      navigate("dashboard", "Go to Dashboard"),
      navigate("contacts", "Go to Contacts"),
      navigate("templates", "Go to Templates"),
      navigate("campaigns", "Go to Campaigns"),
      navigate("staff", "Go to Staff"),
      navigate("settings", "Go to Settings"),
      ...contacts.slice(0, 40).map<Item>((c) => ({
        id: `contact-${c.id}`,
        label: `${c.name} — ${c.email}`,
        group: "Contacts",
        run: () => {
          setActiveView("contacts");
          openContactDetail(c.id);
          close();
        },
      })),
      ...templates.slice(0, 20).map<Item>((t) => ({
        id: `template-${t.id}`,
        label: t.name,
        group: "Templates",
        run: () => {
          setActiveView("templates");
          openTemplateEditor(t.id);
          close();
        },
      })),
      ...campaigns.slice(0, 20).map<Item>((c) => ({
        id: `campaign-${c.id}`,
        label: c.name,
        group: "Campaigns",
        run: () => {
          setActiveView("campaigns");
          openCampaignDetail(c.id);
          close();
        },
      })),
    ];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((i) => i.label.toLowerCase().includes(q));
  }, [
    contacts,
    templates,
    campaigns,
    query,
    setActiveView,
    close,
    openContactDetail,
    openTemplateEditor,
    openCampaignDetail,
  ]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  return (
    <Modal open={open} onClose={close} size="lg" className="!overflow-visible">
      <div className="-m-5 -mb-0">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <Search size={16} className="text-fg-subtle" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                items[active]?.run();
              }
            }}
            placeholder="Search contacts, templates, campaigns…"
            className="flex-1 bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
          />
        </div>
        <div className="max-h-[420px] overflow-y-auto p-2">
          {groupBy(items).map(([group, rows]) => (
            <div key={group} className="mb-2">
              <div className="text-[10px] tracking-wider uppercase text-fg-subtle px-3 pt-2 pb-1">
                {group}
              </div>
              {rows.map((item) => {
                const isActive = items[active]?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() =>
                      setActive(items.findIndex((i) => i.id === item.id))
                    }
                    onClick={item.run}
                    className={
                      "w-full text-left px-3 py-2 rounded-md text-sm truncate transition-colors " +
                      (isActive
                        ? "bg-accent/15 text-fg"
                        : "text-fg hover:bg-bg-hover")
                    }
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-sm text-fg-muted text-center py-8">
              No matches
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function groupBy(items: Item[]): [string, Item[]][] {
  const map = new Map<string, Item[]>();
  for (const item of items) {
    const arr = map.get(item.group) ?? [];
    arr.push(item);
    map.set(item.group, arr);
  }
  return Array.from(map.entries());
}
