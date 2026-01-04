"use client";

import MainMenu from "./components/main-menu";
import Welcome from "./components/welcome";
import MenuTitle from "./components/menu-title";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { MenuIcon } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useState } from "react";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="md:grid md:grid-cols-[250px_1fr] h-screen">
      <MainMenu className="hidden md:flex" />

      {!isDesktop && (
        <div className="p-4 flex justify-between md:hidden sticky top-0 left-0 bg-background border-b border-border">
          <MenuTitle />
          <Drawer 
            direction="right" 
            open={mobileMenuOpen} 
            onClose={() => setMobileMenuOpen(false)}
            onOpenChange={(open) => setMobileMenuOpen(open)}
          >
            <DrawerTrigger>
              <MenuIcon />
            </DrawerTrigger>
            <DrawerContent>
              <VisuallyHidden>
                <DrawerTitle>Navigation Menu</DrawerTitle>
              </VisuallyHidden>
              <MainMenu />
            </DrawerContent>
          </Drawer>
        </div>
      )}

      <div className="overflow-auto py-2 px-4">
        <Welcome />
        {children}
      </div>
    </div>
  );
}
