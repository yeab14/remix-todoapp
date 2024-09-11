import React, { useEffect, useState } from 'react';
import { PrismaClient } from '@prisma/client';
import { json, redirect } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

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

// Define types for props
interface DraggableItemProps {
  id: number;
  index: number;
  title: string;
  completed: boolean;
  onComplete: () => void;
  onDelete: () => void;
}

const DraggableItem: React.FC<DraggableItemProps> = ({
  id,
  index,
  title,
  completed,
  onComplete,
  onDelete
}) => {
  const [, ref] = useDrag({
    type: 'TODO',
    item: { id, index },
  });

  return (
    <li
      ref={ref}
      className="flex justify-between items-center bg-white border rounded p-2"
    >
      <span className={completed ? 'line-through text-gray-500' : ''}>
        {title}
      </span>
      <div className="flex gap-2">
        <Form method="post">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="intent" value="complete" />
          <input type="hidden" name="completed" value={!completed ? 'true' : 'false'} />
          <button type="submit" className={`px-2 py-1 rounded ${completed ? 'bg-gray-500' : 'bg-green-500'} text-white`}>
            {completed ? 'Undo' : 'Complete'}
          </button>
        </Form>
        <Form method="post">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="intent" value="delete" />
          <button type="submit" className="bg-red-500 text-white px-2 py-1 rounded">
            Delete
          </button>
        </Form>
      </div>
    </li>
  );
};

// Define types for props
interface DroppableAreaProps {
  todos: { id: number; title: string; completed: boolean; order: number }[];
  onDrop: (fromIndex: number, toIndex: number) => void;
}

const DroppableArea: React.FC<DroppableAreaProps> = ({ todos, onDrop }) => {
  const [, ref] = useDrop({
    accept: 'TODO',
    drop: (item: { id: number; index: number }) => {
      onDrop(item.index, todos.length - 1);
    },
  });

  return (
    <ul ref={ref} className="space-y-4">
      {todos.length > 0 ? (
        todos.map((todo, index) => (
          <DraggableItem
            key={todo.id}
            id={todo.id}
            index={index}
            title={todo.title}
            completed={todo.completed}
            onComplete={() => {}}
            onDelete={() => {}}
          />
        ))
      ) : (
        <p>No todos found.</p>
      )}
    </ul>
  );
};

// Define type for the todo state
interface Todo {
  id: number;
  title: string;
  completed: boolean;
  order: number;
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const { todos: initialTodos } = useLoaderData<{ todos: Todo[] }>();

  useEffect(() => {
    setTodos(initialTodos);
  }, [initialTodos]);

  const moveTodo = async (fromIndex: number, toIndex: number) => {
    const reorderedTodos = Array.from(todos);
    const [movedTodo] = reorderedTodos.splice(fromIndex, 1);
    reorderedTodos.splice(toIndex, 0, movedTodo);

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

    setTodos(reorderedTodos);
  };

  return (
    <DndProvider backend={HTML5Backend}>
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

        <DroppableArea todos={todos} onDrop={(fromIndex, toIndex) => moveTodo(fromIndex, toIndex)} />
      </div>
    </DndProvider>
  );
}









