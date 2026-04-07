import { readTodos } from "@/lib/parsers/todo-parser";
import { TodoBoard } from "@/components/todo/todo-board";

export default function TodosPage() {
  const todos = readTodos();
  return <TodoBoard initialTodos={todos} />;
}
