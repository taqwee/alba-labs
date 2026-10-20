"use client";

import { useState } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/public/safe-image";
import { motion, AnimatePresence } from "framer-motion";

export function PortfolioGrid({ items }: { items: any[] }) {
  const [activeCategory, setActiveCategory] = useState("All");

  // Get a list of unique categories from your existing projects
  const categories = ["All", ...Array.from(new Set(items.map((w) => w.category).filter(Boolean)))];

  // Filter the projects based on the clicked button
  const filteredItems = activeCategory === "All" 
    ? items 
    : items.filter((w) => w.category === activeCategory);

  return (
    <>
      {/* The Sub-Navbar / Filter Buttons */}
      <div className="mt-8 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat as string}
            onClick={() => setActiveCategory(cat as string)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              activeCategory === cat
                ? "bg-text text-background" 
                : "bg-primary/5 text-muted hover:text-text" 
            }`}
          >
            {cat as string}
          </button>
        ))}
      </div>

      {/* The Animated Filtered Grid */}
      <motion.ul layout className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((w) => (
            <motion.li
              key={w.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
            >
              <Link href={`/work/${w.slug}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-primary/5">
                  {w.cover_url && (
                    <SafeImage 
                      src={w.cover_url} 
                      alt={`${w.title} cover`} 
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" 
                    />
                  )}
                </div>
                <p className="mt-3 font-display text-xl">{w.title}</p>
                {w.category && <p className="text-sm text-muted">{w.category}</p>}
              </Link>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </>
  );
}