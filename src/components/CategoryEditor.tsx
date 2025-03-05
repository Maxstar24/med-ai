import React, { useState } from 'react';
import { ICategory } from '@/types/models';

interface CategoryEditorProps {
  category?: Partial<ICategory>;
  onSave: (category: Partial<ICategory>) => void;
  onCancel: () => void;
}

export const CategoryEditor: React.FC<CategoryEditorProps> = ({
  category,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(category?.name || '');
  const [color, setColor] = useState(category?.color || '#3498db');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...category,
      name,
      color,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Category Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="color" className="block text-sm font-medium text-gray-700">
            Color
          </label>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              id="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-20 rounded cursor-pointer"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="block flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              pattern="^#[0-9A-Fa-f]{6}$"
              placeholder="#000000"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}; 