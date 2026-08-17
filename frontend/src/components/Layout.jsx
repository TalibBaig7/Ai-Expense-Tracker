import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar, { MobileBottomNav } from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

const Layout = () => {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setMobileNavOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileNavOpen]);

    return (
        <div className="h-screen flex bg-slate-50 overflow-hidden">
            <Sidebar
                mobileOpen={mobileNavOpen}
                onMobileClose={() => setMobileNavOpen(false)}
            />
            <div className="flex-1 flex flex-col min-w-0">
                <Topbar onMenuClick={() => setMobileNavOpen(true)} />
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
                    <Outlet />
                </main>
            </div>
            <MobileBottomNav />
        </div>
    );
};

export default Layout;
