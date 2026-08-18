import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    ArrowLeftRight,
    Folder,
    Target,
    Sparkles,
    Wallet,
    LogOut,
    X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, shortLabel: 'Home' },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight, shortLabel: 'Txns' },
    { to: '/categories', label: 'Categories', icon: Folder, shortLabel: 'Cats' },
    { to: '/budgets', label: 'Budgets', icon: Target, shortLabel: 'Budgets' },
    { to: '/insights', label: 'AI Insights', icon: Sparkles, shortLabel: 'AI' },
];

const navLinkClass = ({ isActive }) =>
    `relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition ${
        isActive
            ? 'bg-slate-100 text-slate-900 before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-1 before:rounded-full before:bg-violet-500'
            : 'text-slate-700 hover:bg-slate-50'
    }`;

const bottomNavLinkClass = ({ isActive }) =>
    `flex flex-col items-center justify-center gap-1.5 flex-1 py-2.5 text-xs font-bold transition ${
        isActive ? 'text-violet-600' : 'text-slate-500'
    }`;

const SidebarBrand = () => (
    <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-100 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-linear-to-br from-violet-400 to-violet-600 flex items-center justify-center">
            <Wallet size={16} className="text-white" />
        </div>
        <span className="font-bold text-slate-900">ExpenseAI</span>
    </div>
);

const SidebarUser = ({ user, logout }) => {
    const initial = user?.name?.[0]?.toUpperCase() || 'U';

    return (
        <div className="p-3 border-t border-slate-100 shrink-0">
            <div className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition">
                <div className="h-9 w-9 rounded-full bg-linear-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {initial}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                        {user?.name || 'User'}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                </div>
                <button
                    onClick={logout}
                    title="Logout"
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition shrink-0"
                >
                    <LogOut size={16} />
                </button>
            </div>
        </div>
    );
};

const SidebarNav = ({ onNavigate }) => (
    <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={onNavigate}
                className={navLinkClass}
            >
                <Icon size={20} strokeWidth={1.75} />
                {label}
            </NavLink>
        ))}
    </nav>
);

export const MobileBottomNav = () => (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-300 lg:hidden safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.12)]">
        <div className="flex items-stretch px-0.5 pt-2 pb-2">
            {navItems.map(({ to, label, shortLabel, icon: Icon }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={bottomNavLinkClass}
                >
                    {({ isActive }) => (
                        <>
                            <div
                                className={`h-10 w-10 rounded-2xl flex items-center justify-center transition ${
                                    isActive ? 'bg-violet-100 text-violet-700' : 'text-slate-500'
                                }`}
                            >
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="truncate max-w-full">{shortLabel || label}</span>
                        </>
                    )}
                </NavLink>
            ))}
        </div>
    </nav>
);

const Sidebar = ({ mobileOpen, onMobileClose }) => {
    const { user, logout } = useAuth();

    return (
        <>
            <aside className="w-64 bg-white border-r border-slate-100 hidden lg:flex flex-col shrink-0">
                <SidebarBrand />
                <SidebarNav />
                <SidebarUser user={user} logout={logout} />
            </aside>

            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={onMobileClose}
                        aria-hidden="true"
                    />
                    <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white flex flex-col shadow-2xl mobile-drawer-enter">
                        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-linear-to-br from-violet-400 to-violet-600 flex items-center justify-center">
                                    <Wallet size={16} className="text-white" />
                                </div>
                                <span className="font-bold text-slate-900">ExpenseAI</span>
                            </div>
                            <button
                                onClick={onMobileClose}
                                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition"
                                aria-label="Close menu"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <SidebarNav onNavigate={onMobileClose} />
                        <SidebarUser user={user} logout={logout} />
                    </aside>
                </div>
            )}
        </>
    );
};

export default Sidebar;
