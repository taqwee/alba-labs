import Link from "next/link";
import { getPublishedPortfolio } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { EmptyState } from "@/components/ui/basics";
import { PortfolioGrid } from "@/components/public/portfolio-grid";

export const revalidate = 60;
export const metadata = pageMetadata({ title: "Work", description: "Selected projects from Alba Labs.", path: "/work" });

export default async function WorkPage() {
  const items = await getPublishedPortfolio();
  
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Work</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">Projects we have published.</p>
      
      {items.length === 0 ? (
        <div className="mt-10">
          <EmptyState 
            title="No projects published yet" 
            description="Our portfolio will appear here once projects are added." 
            action={<Link href="/contact" className="btn-primary">Start a project</Link>} 
          />
        </div>
      ) : (
        <PortfolioGrid items={items} />
      )}
    </div>
  );
}