import { useMemo, useState } from "react";
import { X, Bell, CheckCheck, TrendingUp, TrendingDown, AlertCircle, Info } from "lucide-react";
import { useNotificationStore } from "@/stores/useNotificationStore";

type NotifType = "fill" | "cancel" | "price" | "system";

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  logoUrl?: string;
  createdAt: number;
  read: boolean;
}

// Token logo with graceful fallback to the type icon
function TokenLogo({
  src,
  fallbackColor,
  fallbackBg,
  Icon,
}: {
  src: string;
  fallbackColor: string;
  fallbackBg: string;
  Icon: React.ElementType;
}) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return <Icon className="w-3.5 h-3.5" style={{ color: fallbackColor }} />;
  }
  return (
    <img
      src={src}
      alt=""
      className="w-6 h-6 rounded-full object-cover"
      onError={() => setErrored(true)}
    />
  );
}

function formatTime(createdAt: number) {
  const diff = Math.max(0, Date.now() - createdAt);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function iconForType(type: NotifType) {
  if (type === "fill")   return { Icon: TrendingUp,    color: "#00c853", bg: "rgba(0,200,83,0.12)"  };
  if (type === "cancel") return { Icon: TrendingDown,  color: "#ff1744", bg: "rgba(255,23,68,0.12)" };
  if (type === "price")  return { Icon: AlertCircle,   color: "#f5c518", bg: "rgba(245,197,24,0.12)"};
  return                        { Icon: Info,          color: "#7c9cbf", bg: "rgba(124,156,191,0.12)"};
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DesktopNotificationsModal({ open, onClose }: Props) {
  const notifs = useNotificationStore((state) => state.notifications);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const dismiss = useNotificationStore((state) => state.dismissNotification);
  const markRead = useNotificationStore((state) => state.markRead);

  const unread = useMemo(
    () => notifs.filter((n) => !n.read).length,
    [notifs],
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl"
        style={{ width: 480, maxHeight: "80vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#888]" />
            <span className="text-[15px] font-bold text-white">Notifications</span>
            {unread > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center bg-[#f5c518] text-black"
              >
                {unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold transition-all hover:bg-[#1a1a1a] text-[#888]"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[#1a1a1a] text-[#888]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-3">
          {notifs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#1a1a1a]">
                <Bell className="w-5 h-5 text-[#555]" />
              </div>
              <p className="text-[13px] text-[#888]">All caught up</p>
            </div>
          )}

          {notifs.map((n) => {
            const { Icon, color, bg } = iconForType(n.type);
            return (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className="flex items-start gap-3 px-3 py-3 rounded-xl mb-1.5 transition-all hover:bg-[#1a1a1a] cursor-pointer relative"
                style={{
                  backgroundColor: n.read ? "transparent" : "#161616",
                  border: n.read ? "1px solid transparent" : "1px solid #1a1a1a",
                }}
              >
                {/* Unread dot */}
                {!n.read && (
                  <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-[#f5c518]" />
                )}

                {/* Icon / Logo */}
                <div className="relative shrink-0 mt-0.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: bg }}
                  >
                    {n.logoUrl ? (
                      <TokenLogo src={n.logoUrl} fallbackColor={color} fallbackBg={bg} Icon={Icon} />
                    ) : (
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    )}
                  </div>
                  {/* Small type badge in the bottom-right corner of the avatar */}
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#0d0d0d]"
                    style={{ backgroundColor: bg }}
                  >
                    <Icon className="w-2 h-2" style={{ color }} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 min-w-0 gap-1 pr-4">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[13px] font-bold"
                      style={{ color: n.read ? "#666" : "#fff" }}
                    >
                      {n.title}
                    </span>
                    <span className="text-[10px] shrink-0 ml-2 text-[#666]">
                      {formatTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed text-[#888]">
                    {n.body}
                  </p>
                </div>
              </div>
            );
          })}

          <div className="h-2" />
        </div>
      </div>
    </>
  );
}
