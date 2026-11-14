import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { MobileNav } from './MobileNav';
import { Toast } from '../common/Toast';

export const AppLayout = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Drawer */}
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Main Content Area */}
      <div className="app-main">
        <Navbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      {/* Action Toast Notifications */}
      <Toast />
    </div>
  );
};
