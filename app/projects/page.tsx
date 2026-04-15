export const dynamic = "force-dynamic";

import { FolderKanban } from "lucide-react";
import { parseProjects } from "@/lib/projects";
import { ProjectBoard } from "@/components/project-board";

export default function ProjectsPage() {
  const projects = parseProjects();

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FolderKanban className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">프로젝트</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {projects.length > 0
            ? `총 ${projects.length}건의 프로젝트`
            : "프로젝트 현황"}
        </p>
      </div>
      <ProjectBoard projects={projects} />
    </div>
  );
}
