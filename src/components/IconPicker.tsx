import { useState, useRef, useEffect } from "react";
import type { LucideProps } from "lucide-react";
import {
  Code2, Terminal, Database, Server, ShieldCheck, FlaskConical, Zap, Layers,
  Package, GitBranch, Globe, Lock, Cpu, Cloud, Wifi, Monitor, Bug, Key,
  FileCode, Binary, Braces, Webhook, Network, Activity,
  Palette, Pen, Image, Crop, LayoutGrid, Brush, Wand2,
  Briefcase, Building2, Users, User, Star, Heart, Target, Trophy,
  TrendingUp, BarChart2, PieChart, Award,
  CheckSquare, List, Calendar, Clock, Bell, Bookmark, Tag, Flag,
  Inbox, Send, Mail, MessageSquare, Hash,
  Folder, FolderOpen, File, FileText, FilePlus, Archive, BookOpen,
  Settings, Home, Search, Filter, Info, Lightbulb, Rocket, Coffee,
  Music, Camera, ShoppingCart, Truck, MapPin, Phone, Link2,
  ExternalLink, RefreshCw, AlertCircle, CheckCircle2, Video, Headphones, Tv,
  Eye, Smile, ThumbsUp, Flame, Sparkles, Layers3, ArrowRight,
  ChevronDown,
} from "lucide-react";

type LucideComp = React.ComponentType<LucideProps>;

export const ICON_MAP: Record<string, LucideComp> = {
  // Development
  "code-2":      Code2,
  "terminal":    Terminal,
  "database":    Database,
  "server":      Server,
  "shield":      ShieldCheck,
  "flask":       FlaskConical,
  "zap":         Zap,
  "layers":      Layers,
  "package":     Package,
  "git-branch":  GitBranch,
  "globe":       Globe,
  "lock":        Lock,
  "cpu":         Cpu,
  "cloud":       Cloud,
  "wifi":        Wifi,
  "monitor":     Monitor,
  "bug":         Bug,
  "key":         Key,
  "file-code":   FileCode,
  "binary":      Binary,
  "braces":      Braces,
  "webhook":     Webhook,
  "network":     Network,
  "activity":    Activity,
  // Design
  "palette":     Palette,
  "pen":         Pen,
  "image":       Image,
  "crop":        Crop,
  "layout":      LayoutGrid,
  "brush":       Brush,
  "wand":        Wand2,
  // Business / People
  "briefcase":   Briefcase,
  "building":    Building2,
  "users":       Users,
  "user":        User,
  "star":        Star,
  "heart":       Heart,
  "target":      Target,
  "trophy":      Trophy,
  "trending":    TrendingUp,
  "bar-chart":   BarChart2,
  "pie-chart":   PieChart,
  "award":       Award,
  // Tasks / Comms
  "check":       CheckSquare,
  "list":        List,
  "calendar":    Calendar,
  "clock":       Clock,
  "bell":        Bell,
  "bookmark":    Bookmark,
  "tag":         Tag,
  "flag":        Flag,
  "inbox":       Inbox,
  "send":        Send,
  "mail":        Mail,
  "message":     MessageSquare,
  "hash":        Hash,
  // Files
  "folder":      Folder,
  "folder-open": FolderOpen,
  "file":        File,
  "file-text":   FileText,
  "file-plus":   FilePlus,
  "archive":     Archive,
  "book":        BookOpen,
  // Misc
  "settings":    Settings,
  "home":        Home,
  "search":      Search,
  "filter":      Filter,
  "info":        Info,
  "lightbulb":   Lightbulb,
  "rocket":      Rocket,
  "coffee":      Coffee,
  "music":       Music,
  "camera":      Camera,
  "shopping":    ShoppingCart,
  "truck":       Truck,
  "map-pin":     MapPin,
  "phone":       Phone,
  "link":        Link2,
  "external":    ExternalLink,
  "refresh":     RefreshCw,
  "alert":       AlertCircle,
  "check-circle":CheckCircle2,
  "video":       Video,
  "headphones":  Headphones,
  "tv":          Tv,
  "eye":         Eye,
  "smile":       Smile,
  "thumbs-up":   ThumbsUp,
  "flame":       Flame,
  "sparkles":    Sparkles,
  "layers-3":    Layers3,
  "arrow-right": ArrowRight,
};

export function IconDisplay({
  name,
  size = 12,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Comp = ICON_MAP[name] ?? Layers;
  return <Comp size={size} className={className} />;
}

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const allNames = Object.keys(ICON_MAP);
  const filtered = query.trim()
    ? allNames.filter(k => k.includes(query.trim().toLowerCase()))
    : allNames;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors"
        style={{
          background: "var(--c-surface-2)",
          border: "1px solid var(--c-border)",
          color: "var(--c-text-3)",
        }}
      >
        <IconDisplay name={value} size={13} />
        <ChevronDown size={9} style={{ color: "var(--c-text-5)" }} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 dropdown rounded-xl overflow-hidden shadow-2xl"
          style={{ width: 240, border: "1px solid var(--c-border)", zIndex: 9999 }}
        >
          <div className="p-2" style={{ borderBottom: "1px solid var(--c-border-subtle)" }}>
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
              style={{ background: "var(--c-surface-2)" }}
            >
              <Search size={10} style={{ color: "var(--c-text-5)", flexShrink: 0 }} />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search icons…"
                className="flex-1 bg-transparent text-[11px] outline-none"
                style={{ color: "var(--c-text-2)" }}
              />
            </div>
          </div>

          <div
            className="p-2 overflow-y-auto"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: 2,
              maxHeight: 200,
              scrollbarWidth: "none",
            }}
          >
            {filtered.map(name => (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => { onChange(name); setOpen(false); setQuery(""); }}
                className="flex items-center justify-center p-1.5 rounded transition-colors"
                style={{
                  color: name === value ? "var(--c-text-1)" : "var(--c-text-4)",
                  background: name === value ? "var(--c-surface-3)" : undefined,
                }}
                onMouseEnter={e => { if (name !== value) (e.currentTarget as HTMLButtonElement).style.background = "var(--c-surface-2)"; }}
                onMouseLeave={e => { if (name !== value) (e.currentTarget as HTMLButtonElement).style.background = ""; }}
              >
                <IconDisplay name={name} size={13} />
              </button>
            ))}
            {filtered.length === 0 && (
              <span
                className="text-[10px] text-center py-3"
                style={{ gridColumn: "1 / -1", color: "var(--c-text-5)" }}
              >
                No icons
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
