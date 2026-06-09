import { readTodos } from "@/lib/parsers/todo-parser";
import { listArchivedTodos } from "@/lib/archive";
import { TodoBoard } from "@/components/todo/todo-board";

export const dynamic = "force-dynamic";

export default function TodosPage() {
  const todos = readTodos();
  const archived = listArchivedTodos();
  return <TodoBoard initialTodos={todos} initialArchived={archived} />;
}
