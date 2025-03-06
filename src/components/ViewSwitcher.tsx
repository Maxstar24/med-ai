import { Button } from "@/components/ui/button";
import { ViewIcon, Columns, List } from "lucide-react";

interface ViewSwitcherProps {
  currentView: 'list' | 'kanban';
  onViewChange: (view: 'list' | 'kanban') => void;
}

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex gap-2 p-2">
      <Button
        variant={currentView === 'list' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewChange('list')}
      >
        <List className="h-4 w-4 mr-1" />
        List View
      </Button>
      <Button
        variant={currentView === 'kanban' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onViewChange('kanban')}
      >
        <Columns className="h-4 w-4 mr-1" />
        Kanban View
      </Button>
    </div>
  );
} 