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
  Users,
  Clock,
  Target
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

// Project status colors
const STATUS_COLORS = {
  active: '#22C55E',    // Green
  'in-progress': '#F59E0B', // Amber
  overdue: '#EF4444',   // Red
  completed: '#3B82F6', // Blue
};

export default function Calendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedView, setSelectedView] = useState('month');
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
      
      // Convert date strings back to Date objects
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
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    
    // Adjust to start on Monday
    const startDayOfWeek = (firstDay.getDay() + 6) % 7;
    startDate.setDate(1 - startDayOfWeek);

    const days = [];
    for (let i = 0; i < 42; i++) { // 6 weeks
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate]);

  // Get events for a specific day with filtering
  const getEventsForDay = (date: Date) => {
    let filteredEvents = events;
    
    // Apply status-based filtering
    if (filterBy === 'active') {
      filteredEvents = events.filter(event => event.status === 'active');
    } else if (filterBy === 'completed') {
      filteredEvents = events.filter(event => event.status === 'completed' || event.status === 'approved');
    } else if (filterBy === 'overdue') {
      filteredEvents = events.filter(event => event.status === 'overdue');
    }
    // Note: projects/tasks filtering is handled in the API query
    
    return filteredEvents.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      return date >= eventStart && date <= eventEnd;
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
      <div className="animate-pulse space-y-6">
        <div className="h-12 bg-gray-800 rounded w-1/3"></div>
        <div className="h-96 bg-gray-800 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">
            Project Calendar
          </h1>
          <p className="text-gray-400 mt-1">
            {user?.role === 'business' 
              ? 'View project timelines and contractor schedules'
              : 'Track your project deadlines and availability'
            }
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger className="w-40 bg-gray-900 border-gray-700">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="all">Both Projects & Tasks</SelectItem>
              <SelectItem value="projects">Projects Only</SelectItem>
              <SelectItem value="tasks">Tasks Only</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="completed">Completed Only</SelectItem>
              <SelectItem value="overdue">Overdue Only</SelectItem>
            </SelectContent>
          </Select>
          
          {user?.role === 'business' && (
            <Button className="bg-accent-600 hover:bg-accent-700">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Project
            </Button>
          )}
        </div>
      </div>

      {/* Calendar Controls */}
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="border-gray-700 text-white hover:bg-gray-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <h2 className="text-xl font-semibold text-white">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
                className="border-gray-700 text-white hover:bg-gray-800"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              Today
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-800 rounded-lg overflow-hidden">
            {/* Day Headers */}
            {DAY_NAMES.map(day => (
              <div
                key={day}
                className="bg-gray-900 p-3 text-center text-sm font-medium text-gray-400"
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
                    min-h-24 p-2 bg-black border-r border-b border-gray-800 relative
                    ${!isCurrentMonthDay ? 'opacity-40' : ''}
                    ${isTodayDate ? 'ring-2 ring-accent-600' : ''}
                    hover:bg-gray-900 transition-colors cursor-pointer
                  `}
                >
                  <div className={`
                    text-sm font-medium mb-1
                    ${isTodayDate ? 'text-accent-400' : 'text-white'}
                    ${!isCurrentMonthDay ? 'text-gray-600' : ''}
                  `}>
                    {date.getDate()}
                  </div>
                  
                  {/* Events */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        className={`
                          px-1 py-0.5 rounded text-xs font-medium truncate
                          cursor-pointer hover:opacity-80 transition-opacity
                        `}
                        style={{ backgroundColor: event.color + '20', color: event.color }}
                        title={`${event.title} - ${event.contractorName}`}
                      >
                        {event.title}
                      </div>
                    ))}
                    
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-400">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Project Status & Stats */}
      <Card className="bg-black border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="h-5 w-5" />
            Project Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.active }}></div>
                <span className="text-sm text-gray-300">Active Projects</span>
              </div>
              <Badge variant="outline" style={{ borderColor: STATUS_COLORS.active, color: STATUS_COLORS.active }}>
                3
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS['in-progress'] }}></div>
                <span className="text-sm text-gray-300">In Progress</span>
              </div>
              <Badge variant="outline" style={{ borderColor: STATUS_COLORS['in-progress'], color: STATUS_COLORS['in-progress'] }}>
                2
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.overdue }}></div>
                <span className="text-sm text-gray-300">Overdue</span>
              </div>
              <Badge variant="outline" style={{ borderColor: STATUS_COLORS.overdue, color: STATUS_COLORS.overdue }}>
                1
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: STATUS_COLORS.completed }}></div>
                <span className="text-sm text-gray-300">Completed</span>
              </div>
              <Badge variant="outline" style={{ borderColor: STATUS_COLORS.completed, color: STATUS_COLORS.completed }}>
                4
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}