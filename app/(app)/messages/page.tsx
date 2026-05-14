import { MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function MessagesEmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8 sm:py-16">
      <EmptyState
        icon={MessageCircle}
        kicker="Discussions"
        title={
          <>
            Bienvenue dans tes <em className="italic">discussions</em>.
          </>
        }
        body="Choisis une conversation à gauche, ou démarre-en une nouvelle. Tes messages sont chiffrés et stockés en Europe."
        ctaHref="/messages/new"
        ctaLabel="Nouvelle conversation"
        tone="soft"
        size="lg"
      />
    </div>
  );
}
