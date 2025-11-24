"use client";

import { useRef, useState } from "react";
import MacStyleMenu, { type MenuItem } from "./MacStyleMenu.tsx";

interface MenuButtonProps {
  label: string;
  menuItems: MenuItem[];
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "right-aligned";
  className?: string;
}

const MenuButton = ({
  label,
  menuItems,
  position = "top-left",
  className = "",
}: MenuButtonProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        className={className}
        onClick={toggleMenu}
        aria-haspopup="true"
        aria-expanded={isMenuOpen}
      >
        {label}
      </button>

      <MacStyleMenu
        items={menuItems}
        isOpen={isMenuOpen}
        onClose={closeMenu}
        position={position}
      />
    </div>
  );
};

export default MenuButton;
