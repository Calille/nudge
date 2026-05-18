import { useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { useCampaignStore } from "@/stores/campaignStore";
import { CampaignHistory } from "./CampaignHistory";
import { CampaignBuilder } from "./CampaignBuilder";
import { CampaignDetail } from "./CampaignDetail";
import { useUIStore } from "@/stores/uiStore";
import { SendProgress } from "./SendProgress";

export function CampaignsView() {
  const load = useCampaignStore((s) => s.load);
  const builderOpen = useUIStore((s) => s.campaignBuilderOpen);
  const setBuilder = useUIStore((s) => s.setCampaignBuilderOpen);
  const detailId = useUIStore((s) => s.campaignDetailId);
  const closeDetail = useUIStore((s) => s.closeCampaignDetail);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 shrink-0 border-b border-border px-6 flex items-center">
        <div className="ml-auto">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setBuilder(true)}
          >
            New campaign
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <CampaignHistory />
      </div>
      <CampaignBuilder open={builderOpen} onClose={() => setBuilder(false)} />
      <CampaignDetail
        open={detailId !== null}
        onClose={closeDetail}
        campaignId={detailId}
      />
      <SendProgress />
    </div>
  );
}
