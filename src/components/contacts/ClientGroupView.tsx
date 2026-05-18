import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronRight, Mail, Users } from "lucide-react";
import { useContactStore } from "@/stores/contactStore";
import { useUIStore, toast } from "@/stores/uiStore";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/shared/Button";
import type { Contact } from "@/types";

export function ClientGroupView() {
  const clients = useContactStore((s) => s.clients);
  const loadClients = useContactStore((s) => s.loadClients);
  const setActive = useUIStore((s) => s.setActiveView);
  const openCampaignBuilder = useUIStore((s) => s.setCampaignBuilderOpen);
  const openContactDetail = useUIStore((s) => s.openContactDetail);

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [contactsByClient, setContactsByClient] = useState<
    Record<number, Contact[]>
  >({});

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const toggle = async (id: number) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
    if (!contactsByClient[id]) {
      try {
        const data = await window.api.clients.getWithContacts(id);
        setContactsByClient((c) => ({ ...c, [id]: data.contacts }));
      } catch (err: any) {
        toast({ title: "Failed to load contacts", description: err.message, tone: "error" });
      }
    }
  };

  const sorted = useMemo(
    () => [...clients].sort((a, b) => b.contact_count - a.contact_count),
    [clients]
  );

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          icon={Building2}
          title="No clients yet"
          description="Import contacts and they'll be grouped by client automatically."
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-2">
        {sorted.map((client) => {
          const isOpen = !!expanded[client.id];
          const clientContacts = contactsByClient[client.id];
          return (
            <div
              key={client.id}
              className="border border-border rounded-lg bg-bg-elevated overflow-hidden"
            >
              <button
                onClick={() => toggle(client.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-hover transition-colors"
              >
                {isOpen ? (
                  <ChevronDown size={14} className="text-fg-muted" />
                ) : (
                  <ChevronRight size={14} className="text-fg-muted" />
                )}
                <Building2 size={16} className="text-accent" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{client.name}</div>
                </div>
                <div className="flex items-center gap-3 text-xs text-fg-muted">
                  <span className="inline-flex items-center gap-1">
                    <Users size={12} /> {client.contact_count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {client.staff_count} staff
                  </span>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-border bg-bg-subtle">
                  <div className="px-4 py-2 flex items-center justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Mail size={12} />}
                      onClick={() => {
                        setActive("campaigns");
                        openCampaignBuilder(true);
                      }}
                    >
                      Email all
                    </Button>
                  </div>
                  {clientContacts ? (
                    clientContacts.length === 0 ? (
                      <div className="px-4 py-6 text-xs text-fg-muted">
                        No contacts at this client.
                      </div>
                    ) : (
                      <ul className="divide-y divide-border">
                        {clientContacts.map((c) => (
                          <li
                            key={c.id}
                            onClick={() => openContactDetail(c.id)}
                            className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-bg-hover/50"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-fg truncate">
                                {c.name}
                              </div>
                              <div className="text-xs text-fg-muted truncate font-mono">
                                {c.email}
                              </div>
                            </div>
                            {c.role && (
                              <div className="text-xs text-fg-muted">
                                {c.role}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )
                  ) : (
                    <div className="px-4 py-4 text-xs text-fg-muted">
                      Loading…
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
