import { Bell, Menu, Search, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
};

const formatToday = () =>
    new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

const Topbar = ({ onMenuClick }) => {
    const { user, logout } = useAuth();
    const firstName = user?.name?.split(' ')[0] || '';

    return (
        <header className="h-14 sm:h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden h-10 w-10 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition shrink-0"
                    aria-label="Open menu"
                >
                    <Menu size={20} />
                </button>
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 tracking-tight truncate">
                        {greeting()}{firstName && `, ${firstName}`} 👋
                    </div>
                    <div className="text-xs text-slate-500 hidden sm:block">{formatToday()}</div>
                </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
                <button
                    title="Search"
                    className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition"
                >
                    <Search size={17} />
                </button>
                <button
                    title="Notifications"
                    className="relative h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition"
                >
                    <Bell size={17} />
                    <span className="absolute top-2 right-2 h-2 w-2 bg-rose-500 rounded-full ring-2 ring-white" />
                </button>
                <button
                    onClick={logout}
                    title="Logout"
                    className="lg:hidden h-11 w-11 rounded-full text-slate-500 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition"
                >
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
};

export default Topbar;
