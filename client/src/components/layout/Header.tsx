import { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Bell, 
  User,
  ChevronDown,
  Settings,
  LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
  const { user, logoutMutation } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch notification count
  const { data: notificationCount = 0 } = useQuery({
    queryKey: ['/api/notifications/count'],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch notifications when menu is open
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: !!user && notificationMenuOpen,
    refetchInterval: notificationMenuOpen ? 10000 : false, // Refresh every 10 seconds when open
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => 
      apiRequest("PATCH", `/api/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
    }
  });

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const toggleNotificationMenu = () => {
    setNotificationMenuOpen(!notificationMenuOpen);
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    logoutMutation.mutate();
  };

  // Get the first name and last name from user if available
  const displayName = user ? 
    `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 
    'Guest';

  return (
    <header className="bg-black border-b border-zinc-800 sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex-1 max-w-xl px-4 md:px-0 mx-auto hidden md:block">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Search size={16} />
            </span>
            <input 
              type="text" 
              placeholder="Search projects, sub contractors, or freelancers..." 
              className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent placeholder-gray-500"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="md:hidden text-white hover:text-gray-300">
            <Search size={20} />
          </button>
          
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={toggleNotificationMenu}
              className="relative text-white hover:text-gray-300 focus:outline-none"
            >
              <Bell size={20} />
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-destructive text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            
            {notificationMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-zinc-900 rounded-md shadow-lg py-1 z-20 border border-zinc-800 max-h-96 overflow-y-auto">
                <div className="px-4 py-2 border-b border-zinc-800">
                  <h3 className="text-sm font-medium text-white">Notifications</h3>
                </div>
                {notifications.length > 0 ? (
                  notifications.slice(0, 10).map((notification: any) => (
                    <div 
                      key={notification.id} 
                      onClick={() => handleNotificationClick(notification)}
                      className="px-4 py-3 hover:bg-zinc-800 border-b border-zinc-800 last:border-b-0 cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{notification.title}</p>
                          <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-accent-500 rounded-full flex-shrink-0 mt-1"></div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center">
                    <Bell className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-400">No notifications yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={toggleUserMenu}
              className="flex items-center space-x-1 focus:outline-none"
            >
              <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-white overflow-hidden">
                <User size={16} />
              </div>
              <span className="hidden md:inline text-sm font-medium text-white">{displayName}</span>
              <ChevronDown className="hidden md:inline text-xs text-white" size={14} />
            </button>
            
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-zinc-900 rounded-md shadow-lg py-1 z-20 border border-zinc-800">
                <Link href="/settings">
                  <div className="flex items-center px-4 py-2 text-sm text-white hover:bg-zinc-800 cursor-pointer">
                    <Settings size={16} className="mr-2" />
                    Account Settings
                  </div>
                </Link>
                <div className="border-t border-zinc-800 my-1"></div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center w-full text-left px-4 py-2 text-sm text-white hover:bg-zinc-800"
                  disabled={logoutMutation.isPending}
                >
                  <LogOut size={16} className="mr-2" />
                  {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
