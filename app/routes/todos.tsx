import { PrismaClient } from '@prisma/client';
import { json, redirect } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const prisma = new PrismaClient();

// Loader function to fetch ToDos
export const loader = async () => {
  const todos = await prisma.todo.findMany({
    orderBy: { order: 'asc' } 
  });
  return json({ todos });
};

// Action function to handle form submissions
export const action = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const intent = formData.get('intent')?.toString();
  const id = formData.get('id')?.toString();
  const title = formData.get('title')?.toString();
  const completed = formData.get('completed') === 'true';
  const order = formData.get('order') ? Number(formData.get('order')) : undefined;

  switch (intent) {
    case 'delete':
      if (id) {
        await prisma.todo.delete({ where: { id: Number(id) } });
      }
      break;

    case 'complete':
      if (id) {
        await prisma.todo.update({
          where: { id: Number(id) },
          data: { completed }
        });
      }
      break;

    case 'updateOrder':
      if (id && order !== undefined) {
        await prisma.todo.update({
          where: { id: Number(id) },
          data: { order }
        });
      }
      break;

    default:
      if (title) {
        await prisma.todo.create({
          data: { title, order: 0 } // Set default order
        });
      }
      break;
  }

  return redirect('/todos');
};

// Component to render the ToDo list
export default function TodoList() {
  const { todos } = useLoaderData<{ todos: { id: number; title: string; completed: boolean; order: number }[] }>();

  // Handle drag-and-drop event
  const onDragEnd = async (result: any) => {
    if (!result.destination) return;

    const reorderedTodos = Array.from(todos);
    const [movedTodo] = reorderedTodos.splice(result.source.index, 1);
    reorderedTodos.splice(result.destination.index, 0, movedTodo);

    // Update the order in the database
    for (let i = 0; i < reorderedTodos.length; i++) {
      const todo = reorderedTodos[i];
      await fetch('/todos', {
        method: 'POST',
        body: new URLSearchParams({
          intent: 'updateOrder',
          id: todo.id.toString(),
          order: i.toString()
        }),
      });
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Todo List</h1>

      <Form method="post" className="flex gap-2 mb-6">
        <input
          name="title"
          type="text"
          placeholder="Add a new todo"
          className="p-2 border rounded w-full"
          required
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Add
        </button>
      </Form>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="droppable">
          {(provided) => (
            <ul
              className="space-y-4"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {todos.length > 0 ? (
                todos.map((todo, index) => (
                  <Draggable key={todo.id} draggableId={todo.id.toString()} index={index}>
                    {(provided) => (
                      <li
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="flex justify-between items-center bg-white border rounded p-2"
                      >
                        <span className={todo.completed ? 'line-through text-gray-500' : ''}>
                          {todo.title}
                        </span>
                        <div className="flex gap-2">
                          <Form method="post">
                            <input type="hidden" name="id" value={todo.id} />
                            <input type="hidden" name="intent" value="complete" />
                            <input type="hidden" name="completed" value={!todo.completed} />
                            <button type="submit" className={`px-2 py-1 rounded ${todo.completed ? 'bg-gray-500' : 'bg-green-500'} text-white`}>
                              {todo.completed ? 'Undo' : 'Complete'}
                            </button>
                          </Form>

                          <Form method="post">
                            <input type="hidden" name="id" value={todo.id} />
                            <input type="hidden" name="intent" value="delete" />
                            <button type="submit" className="bg-red-500 text-white px-2 py-1 rounded">
                              Delete
                            </button>
                          </Form>
                        </div>
                      </li>
                    )}
                  </Draggable>
                ))
              ) : (
                <p>No todos found.</p>
              )}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}






