export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, User, Tag, FileText } from "lucide-react";
import { readPlanDetail } from "@/lib/plans";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  review: "bg-yellow-100 text-yellow-700",
  final: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  review: "Review",
  final: "Final",
};

interface PageProps {
  searchParams: { project?: string | string[]; file?: string | string[] };
}

export default async function PlanViewPage({ searchParams }: PageProps) {
  const rawProject = searchParams.project;
  const rawFile = searchParams.file;
  const project = Array.isArray(rawProject) ? rawProject[0] : rawProject;
  const file = Array.isArray(rawFile) ? rawFile[0] : rawFile;

  if (!project || !file) {
    redirect("/projects");
  }

  const plan = await readPlanDetail(project, file);

  if (!plan) {
    return (
      <div className="p-4 md:p-6 max-w-3xl">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Projects
        </Link>
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Plan not found.</p>
          <p className="text-xs mt-1 font-mono text-muted-foreground/60">
            {project}/{file}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Projects
      </Link>

      {/* Summary card */}
      <div className="mb-6 pb-4 border-b border-border">
        <div className="flex items-start gap-3 mb-3">
          <h1 className="text-xl font-bold flex-1 leading-snug">{plan.title}</h1>
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${
              STATUS_COLORS[plan.status] ?? "bg-muted text-muted-foreground"
            }`}
          >
            {STATUS_LABELS[plan.status] ?? plan.status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {plan.author && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {plan.author}
            </span>
          )}
          {plan.date && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {plan.date}
            </span>
          )}
        </div>

        {plan.tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <Tag className="w-3 h-3 text-muted-foreground" />
            {plan.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {plan.phases.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground font-medium mb-1.5">Phases</p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-0.5">
              {plan.phases.map((phase) => (
                <li key={phase.number}>
                  <span className="text-foreground">{phase.title || `Phase ${phase.number}`}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Markdown body */}
      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: plan.html }}
      />
    </div>
  );
}
