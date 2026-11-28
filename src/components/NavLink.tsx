import React from 'react';
import { getRoute, type RouteId } from '../seo/routes';
import { preloadRoute } from '../lazyViews';

interface NavLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> {
  to: RouteId;
  active?: boolean;
  onNavigate: (id: RouteId) => void;
}

/**
 * Enlace real (<a href>) que rastreadores, "abrir en nueva pestaña" y lectores de pantalla entienden,
 * pero que navega sin recargar la página (History API) con un clic normal.
 */
export const NavLink: React.FC<NavLinkProps> = ({ to, active, onNavigate, children, ...rest }) => (
  <a
    {...rest}
    href={getRoute(to).path}
    aria-current={active ? 'page' : undefined}
    onMouseEnter={() => preloadRoute(to)}
    onFocus={() => preloadRoute(to)}
    onClick={(e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      onNavigate(to);
    }}
  >
    {children}
  </a>
);
