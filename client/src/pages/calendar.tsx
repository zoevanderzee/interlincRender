import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Circle
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Calendar event interface matching API response
interface CalendarEvent {
  id: string;
  title: string;
  projectName: string;
  contractorName: string;
  startDate: Date;
  endDate: Date;
  type: 'milestone' | 'project' | 'deadline';
  status: 'active' | 'completed' | 'overdue' | 'pending' | 'approved' | 'needs_revision';
  color: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Status colors matching your theme
const STATUS_CONFIG = {
  active: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: Circle },
  pending: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: Clock },
  overdue: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: AlertCircle },
  completed: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', icon: CheckCircle2 },
  approved: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: CheckCircle2 },
  needs_revision: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: AlertCircle }
};

export default function Calendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterBy, setFilterBy] = useState('all');

  // Real calendar events from API
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['/api/calendar/events', currentDate.getMonth(), currentDate.getFullYear(), filterBy],
    queryFn: async () => {
      const params = new URLSearchParams({
        month: currentDate.getMonth().toString(),
        year: currentDate.getFullYear().toString(),
        type: filterBy === 'all' ? 'both' :
              filterBy === 'projects' ? 'projects' :
              filterBy === 'tasks' ? 'tasks' : 'both'
      });

      const response = await fetch(`/api/calendar/events?${params}`, {
        credentials: 'include',
        headers: {
          'X-User-ID': user?.id?.toString() || ''
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }

      const data = await response.json();

      return data.map((event: any) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate)
      }));
    },
    enabled: !!user
  });

  // Calendar navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);

    const startDayOfWeek = (firstDay.getDay() + 6) % 7;
    startDate.setDate(1 - startDayOfWeek);

    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate]);

  // Get events for a specific day with filtering
  const getEventsForDay = (date: Date) => {
    let filteredEvents = events;

    if (filterBy === 'active') {
      filteredEvents = events.filter(event => event.status === 'active');
    } else if (filterBy === 'completed') {
      filteredEvents = events.filter(event => event.status === 'completed' || event.status === 'approved');
    } else if (filterBy === 'overdue') {
      filteredEvents = events.filter(event => event.status === 'overdue');
    }

    // BULLETPROOF: Only show events on their exact due date (no date ranges)
    return filteredEvents.filter(event => {
      const eventDueDate = new Date(event.endDate);
      const targetDate = new Date(date);

      // Normalize both dates to midnight for accurate comparison
      eventDueDate.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);

      return eventDueDate.getTime() === targetDate.getTime();
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800 rounded w-1/4"></div>
          <div className="h-96 bg-zinc-800 rounded"></div>
        </div>
      </div>
    );
  }

  // Get work requests to match dashboard Active Assignments count
  const { data: workRequests = [] } = useQuery({
    queryKey: ['/api/work-requests'],
    queryFn: async () => {
      const response = await fetch('/api/work-requests', {
        credentials: 'include',
        headers: {
          'X-User-ID': user?.id?.toString() || ''
        }
      });
      if (!response.ok) throw new Error('Failed to fetch work requests');
      return response.json();
    },
    enabled: !!user
  });

  // BULLETPROOF: Calculate stats matching dashboard Active Assignments exactly
  // Active = accepted work requests (same as dashboard activeAssignments)
  const statusCounts = {
    active: workRequests.filter((wr: any) => wr.status === 'accepted').length,
    pending: workRequests.filter((wr: any) => wr.status === 'pending').length,
    overdue: workRequests.filter((wr: any) => wr.status === 'overdue').length,
    completed: workRequests.filter((wr: any) => wr.status === 'completed').length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Project Calendar
          </h1>
          <p className="text-zinc-400 mt-1">
            {user?.role === 'business'
              ? 'View project timelines and contractor schedules'
              : 'Track your project deadlines and availability'
            }
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700 text-white">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="projects">Projects Only</SelectItem>
              <SelectItem value="tasks">Tasks Only</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="completed">Completed Only</SelectItem>
              <SelectItem value="overdue">Overdue Only</SelectItem>
            </SelectContent>
          </Select>

          {user?.role === 'business' && (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(statusCounts).map(([status, count]) => {
          const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
          const Icon = config.icon;
          return (
            <Card key={status} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: config.bg }}>
                      <Icon className="h-5 w-5" style={{ color: config.color }} />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-400 capitalize">{status}</p>
                      <p className="text-2xl font-bold text-white">{count}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Calendar */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth('prev')}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <h2 className="text-2xl font-semibold text-white min-w-[200px] text-center">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth('next')}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={goToToday}
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Today
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {/* Day Headers */}
            {DAY_NAMES.map(day => (
              <div
                key={day}
                className="p-4 text-center text-sm font-semibold text-zinc-400 border-b border-zinc-800"
              >
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((date, index) => {
              const dayEvents = getEventsForDay(date);
              const isCurrentMonthDay = isCurrentMonth(date);
              const isTodayDate = isToday(date);

              return (
                <div
                  key={index}
                  className={`
                    min-h-[120px] p-3 border-r border-b border-zinc-800 relative
                    ${!isCurrentMonthDay ? 'bg-zinc-950 opacity-50' : 'bg-zinc-900'}
                    ${isTodayDate ? 'ring-2 ring-inset ring-blue-500' : ''}
                    hover:bg-zinc-800 transition-colors cursor-pointer
                  `}
                >
                  <div className={`
                    text-sm font-semibold mb-2
                    ${isTodayDate ? 'text-blue-400' : isCurrentMonthDay ? 'text-white' : 'text-zinc-600'}
                  `}>
                    {date.getDate()}
                  </div>

                  {/* Events */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(event => {
                      const config = STATUS_CONFIG[event.status];
                      return (
                        <div
                          key={event.id}
                          className="px-2 py-1 rounded text-xs font-medium truncate cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: config.bg, color: config.color }}
                          title={`${event.title} - ${event.contractorName}`}
                        >
                          {event.title}
                        </div>
                      );
                    })}

                    {dayEvents.length > 3 && (
                      <div className="text-xs text-zinc-500 pl-2">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}