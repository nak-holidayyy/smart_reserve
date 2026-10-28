
import React from 'react';
import {
  CalendarDays,
  Building2,
  LogOut,
  ArrowRight,
  LayoutDashboard
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Header({
  session,
  onHome,
  onExplore,
  onChat,
  onSignIn
}) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a
          className="brand"
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            onHome?.();
          }}
        >
          <span className="brand-mark">
            <CalendarDays size={19} strokeWidth={2.2} />
          </span>
          <span>Smart Reserve<span className="brand-dot">.</span></span>
        </a>

        <nav className="header-actions">
          <button className="nav-link" onClick={onHome}>
            <LayoutDashboard size={16} />
            Dashboard
          </button>

          <button className="nav-link" onClick={onExplore}>
            <Building2 size={16} />
            Facilities
          </button>

          {session ? (
            <>
              <button
                className="avatar"
                title={session.user.email || 'Signed-in user'}
                aria-label="Signed-in user"
              >
                {session.user.email?.slice(0, 1).toUpperCase() || 'U'}
              </button>

              <button
                className="icon-button logout"
                title="Sign out"
                aria-label="Sign out"
                onClick={() => supabase.auth.signOut()}
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button
              className="button button-small button-outline"
              onClick={onSignIn}
            >
              Sign in <ArrowRight size={15} />
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
