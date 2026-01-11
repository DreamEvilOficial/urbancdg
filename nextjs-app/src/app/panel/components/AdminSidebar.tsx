import {
  Star,
  Package,
  Layers,
  ShoppingBag,
  Settings,
  LogOut,
  LayoutDashboard,
  Filter,
  User,
  Shield,
  Layout,
  DollarSign,
  MessageSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/supabase";
import { useState, useEffect } from "react";

interface SidebarItemProps {
  id: string;
  icon: any;
  label: string;
  activeTab: string;
  setActiveTab: (id: string) => void;
  onClick?: () => void;
}

const SidebarItem = ({
  id,
  icon: Icon,
  label,
  onClick,
  activeTab,
  setActiveTab,
}: SidebarItemProps) => (
  <button
    onClick={() => {
      setActiveTab(id);
      onClick && onClick();
    }}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
      activeTab === id
        ? "bg-accent text-ink shadow-[0_16px_40px_-18px_rgba(183,255,42,0.45)]"
        : "text-white/70 hover:bg-white/[0.06] hover:text-white border border-transparent hover:border-white/10"
    }`}
  >
    <Icon className="w-4 h-4" />
    <span className="font-black text-[11px] uppercase tracking-[0.22em]">{label}</span>
  </button>
);

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  storeName: string;
  onNavigate?: () => void;
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  sidebarOpen,
  storeName,
  onNavigate,
}: AdminSidebarProps) {
  const router = useRouter();
  const [version, setVersion] = useState("v1.0.8-JAN");

  useEffect(() => {
    fetch("/api/version")
      .then((res) => res.json())
      .then((data) => {
        if (data.version) setVersion(data.version);
      })
      .catch(() => {});
  }, []);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#05060a]/75 backdrop-blur-2xl border-r border-white/10 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } lg:relative lg:translate-x-0 flex flex-col h-screen`}
    >
      <div className="p-4 border-b border-white/10 flex-shrink-0 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 left-8 h-28 w-28 rounded-full bg-accent/14 blur-2xl" />
          <div className="absolute -bottom-16 right-6 h-28 w-28 rounded-full bg-accent2/12 blur-2xl" />
        </div>

        <div className="relative">
          <div className="flex items-center justify-between gap-2 text-white mb-1">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-white" />
              <h2 className="font-display text-xl tracking-[0.08em] uppercase">Admin</h2>
            </div>
            <span className="text-[9px] font-mono text-white/30 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
              {version}
            </span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/45 truncate">{storeName}</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto min-h-0 flex flex-col" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <SidebarItem
          id="home"
          icon={Layout}
          label="Configurar Inicio"
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); onNavigate && onNavigate(); }}
        />
        <SidebarItem
          id="productos"
          icon={Package}
          label="Productos"
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); onNavigate && onNavigate(); }}
        />
        <SidebarItem
          id="destacados"
          icon={Star}
          label="Destacados"
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); onNavigate && onNavigate(); }}
        />
        <SidebarItem
          id="categorias"
          icon={Layers}
          label="Categorías"
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); onNavigate && onNavigate(); }}
        />
        <SidebarItem
          id="filtros"
          icon={Filter}
          label="Filtros Especiales"
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); onNavigate && onNavigate(); }}
        />
        <SidebarItem
          id="ventas"
          icon={ShoppingBag}
          label="Ventas"
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); onNavigate && onNavigate(); }}
        />
        <SidebarItem
          id="operadores"
          icon={Shield}
          label="Operadores"
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); onNavigate && onNavigate(); }}
        />
        <SidebarItem
          id="perfil"
          icon={User}
          label="Mi Perfil"
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); onNavigate && onNavigate(); }}
        />
        <SidebarItem
          id="deudas"
          icon={DollarSign}
          label="Deudas"
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); onNavigate && onNavigate(); }}
        />
        <SidebarItem
          id="resenas"
          icon={MessageSquare}
          label="Reseñas"
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); onNavigate && onNavigate(); }}
        />
        <SidebarItem
          id="configuracion"
          icon={Settings}
          label="Configuración"
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); onNavigate && onNavigate(); }}
        />
        
        <div className="pt-4 border-t border-white/10 mt-4">
          <button
            onClick={async () => {
              await authAPI.signOut();
              router.push("/panel");
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-300/90 hover:bg-red-500/10 hover:text-red-200 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-black text-[11px] uppercase tracking-[0.22em]">Cerrar Sesión</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
