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
    return <Icon className="w-4 h-4" style={{ color: fallbackColor }} />;
  }
  return (
    <img
      src={src}
      alt=""
      className="w-7 h-7 rounded-full object-cover"
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

export function MobileNotificationsSheet({ open, onClose }: Props) {
  const notifs = useNotificationStore((state) => state.notifications);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const dismiss = useNotificationStore((state) => state.dismissNotification);
  const markRead = useNotificationStore((state) => state.markRead);

  const unread = useMemo(
    () => notifs.filter((n) => !n.read).length,
    [notifs],
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-all duration-300"
        style={{
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: open ? "blur(3px)" : "none",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          backgroundColor: "var(--m-bg-1)",
          borderRadius: "20px 20px 0 0",
          border: "1px solid var(--m-bdr)",
          borderBottom: "none",
          maxHeight: "86vh",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
      >
        {/* Handle */}
        <div className="flex flex-col items-center pt-3 shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--m-bg-4)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" style={{ color: "var(--m-fg-4)" }} />
            <span className="text-[15px] font-bold" style={{ color: "var(--m-fg)" }}>Notifications</span>
            {unread > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                style={{ backgroundColor: "#f5c518", color: "#000" }}
              >
                {unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 h-8 px-3 rounded-xl text-[11px] font-semibold transition-all active:scale-95"
                style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-3)" }}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors active:scale-90 ml-1"
              style={{ backgroundColor: "var(--m-bg-3)", color: "var(--m-fg-4)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mx-4 h-px shrink-0" style={{ backgroundColor: "var(--m-bdr)" }} />

        {/* List */}
        <div className="overflow-y-auto flex-1 px-3 py-2">
          {notifs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: "var(--m-bg-3)" }}
              >
                <Bell className="w-5 h-5" style={{ color: "var(--m-fg-5)" }} />
              </div>
              <p className="text-[13px]" style={{ color: "var(--m-fg-4)" }}>All caught up</p>
            </div>
          )}

          {notifs.map((n) => {
            const { Icon, color, bg } = iconForType(n.type);
            return (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className="flex items-start gap-3 px-3 py-3 rounded-2xl mb-1 transition-all active:scale-[0.98] cursor-pointer relative"
                style={{
                  backgroundColor: n.read ? "transparent" : "var(--m-bg-2)",
                  border: n.read ? "1px solid transparent" : "1px solid var(--m-bdr)",
                }}
              >
                {/* Unread dot */}
                {!n.read && (
                  <div
                    className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "#f5c518" }}
                  />
                )}

                {/* Icon / Logo */}
                <div className="relative shrink-0 mt-0.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: bg }}
                  >
                    {n.logoUrl ? (
                      <TokenLogo src={n.logoUrl} fallbackColor={color} fallbackBg={bg} Icon={Icon} />
                    ) : (
                      <Icon className="w-4 h-4" style={{ color }} />
                    )}
                  </div>
                  {/* Small type badge in the bottom-right corner of the avatar */}
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: bg, border: "1.5px solid var(--m-bg-1)" }}
                  >
                    <Icon className="w-2.5 h-2.5" style={{ color }} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 min-w-0 gap-0.5 pr-4">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[13px] font-bold"
                      style={{ color: n.read ? "var(--m-fg-3)" : "var(--m-fg)" }}
                    >
                      {n.title}
                    </span>
                    <span className="text-[10px] shrink-0 ml-2" style={{ color: "var(--m-fg-5)" }}>
                      {formatTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--m-fg-4)" }}>
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
