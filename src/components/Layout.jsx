import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Home,
  Timer,
  Calculator,
  Info,
  TrendingUp,
  ChevronRight,
  ListTodo,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Layout({ children, currentPageName }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Don't show layout on splash screen
  if (currentPageName === "Splash") {
    return children;
  }

  const menuItems = [
    { name: "Home", icon: Home, page: "Home", to: "/home" },
    { name: "BP", icon: Star, page: "BP", to: "/bp" },
    { name: "Timer", icon: Timer, page: "Timer", to: "/timer" },
    { name: "Calculator", icon: Calculator, page: "Calculator", to: "/calculator" },
    { name: "About", icon: Info, page: "About", to: "/about" }
  ];

  const currentItem = menuItems.find((item) => item.page === currentPageName);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="flex items-center justify-between px-4 h-16">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDrawerOpen(true)}
            className="hover:bg-slate-100"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </Button>

          <h1 className="font-semibold text-slate-900 flex items-center gap-2">
            {currentItem?.icon && <currentItem.icon className="w-5 h-5" />}
            {currentPageName}
          </h1>

          <div className="w-10" />
        </div>
      </header>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsDrawerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Resale Helper</h2>
                  <p className="text-indigo-200 text-sm">Track • Calculate • Succeed</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
                Menu
              </p>

              <div className="space-y-1">
                {menuItems.map((item, index) => {
                  const isActive = currentPageName === item.page;

                  return (
                    <motion.div
                      key={item.page}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={item.to}
                        onClick={() => setIsDrawerOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          isActive
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <item.icon
                          className={`w-5 h-5 ${isActive ? "text-indigo-600" : "text-slate-400"}`}
                        />
                        <span className="font-medium flex-1">{item.name}</span>
                        {isActive && <ChevronRight className="w-4 h-4 text-indigo-400" />}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-100">
              <p className="text-slate-500 text-center mb-6">
                 Version {__APP_VERSION__}
            </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pt-16">{children}</main>
    </div>
  );
}
