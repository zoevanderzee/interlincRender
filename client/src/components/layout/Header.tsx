import { Link } from "wouter";
import { Bell, Settings, LogOut, User, Shield, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useIntegratedData } from "@/hooks/use-integrated-data";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Logo from "@assets/CD_icon_light@2x.png";
import { useState, useEffect } from "react";

export default function Header() {
  const { user, logoutMutation } = useAuth();
  const { data: integratedData } = useIntegratedData();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      logoutMutation.mutate();
    } catch (error) {
      console.error('Logout error:', error);
      logoutMutation.mutate(); // Fallback to local logout
    }
  };

  const getDisplayName = () => {
    if (user?.companyName) return user.companyName;
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    return user?.username || "User";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getRoleBadge = () => {
    if (user?.role === 'business') return 'Business';
    if (user?.role === 'contractor') return 'Contractor';
    if (user?.role === 'admin') return 'Admin';
    return 'User';
  };

  return (
    <header className="bg-background border-b border-border h-16 flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center space-x-4">
        <Link href="/">
          <div className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <img src={Logo} alt="Interlinc" className="h-8 w-auto object-contain" />
            <span className="font-semibold text-xl text-foreground">Interlinc</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          className="text-zinc-400 hover:text-primary transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-primary transition-colors">
            <Bell size={20} />
            {integratedData?.notificationCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-600 text-white">
                {integratedData.notificationCount > 9 ? '9+' : integratedData.notificationCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:ring-2 hover:ring-[#6b9aff]/30 transition-all duration-300">
              <Avatar className="h-10 w-10 ring-2 ring-[#6b9aff]/20 hover:ring-[#6b9aff]/40 transition-all duration-300">
                <AvatarImage src={user?.profileImageUrl || undefined} alt={getDisplayName()} />
                <AvatarFallback className="bg-gradient-to-br from-[#6b9aff]/30 to-[#5a89ef]/20 text-white font-semibold border border-[#6b9aff]/20">
                  {getInitials(getDisplayName())}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72 bg-gradient-to-br from-[#0f1f3a] to-[#0a1628] border border-[#6b9aff]/20 shadow-2xl backdrop-blur-xl" align="end" forceMount>
            <DropdownMenuLabel className="font-normal p-4 border-b border-[#6b9aff]/10">
              <div className="flex items-start space-x-3">
                <Avatar className="h-12 w-12 ring-2 ring-[#6b9aff]/30">
                  <AvatarImage src={user?.profileImageUrl || undefined} alt={getDisplayName()} />
                  <AvatarFallback className="bg-gradient-to-br from-[#6b9aff]/30 to-[#5a89ef]/20 text-white font-semibold">
                    {getInitials(getDisplayName())}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 min-w-0">
                  <p className="text-base font-semibold text-white truncate tracking-tight">{getDisplayName()}</p>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">{user?.email}</p>
                  <Badge variant="outline" className="text-xs border-[#6b9aff]/30 text-[#6b9aff] bg-[#6b9aff]/5 mt-2 w-fit font-medium">
                    {getRoleBadge()}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>

            <div className="p-1.5">
              <Link href="/settings">
                <DropdownMenuItem className="text-zinc-300 hover:text-white hover:bg-gradient-to-r hover:from-[#6b9aff]/15 hover:to-[#6b9aff]/5 cursor-pointer rounded-lg px-3 py-2.5 transition-all duration-200 group">
                  <User className="mr-3 h-4 w-4 text-[#6b9aff] group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">Profile Settings</span>
                </DropdownMenuItem>
              </Link>

              {user?.role === 'admin' && (
                <Link href="/admin">
                  <DropdownMenuItem className="text-zinc-300 hover:text-white hover:bg-gradient-to-r hover:from-[#6b9aff]/15 hover:to-[#6b9aff]/5 cursor-pointer rounded-lg px-3 py-2.5 transition-all duration-200 group">
                    <Shield className="mr-3 h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform duration-200" />
                    <span className="font-medium">Admin Panel</span>
                  </DropdownMenuItem>
                </Link>
              )}
            </div>

            <DropdownMenuSeparator className="bg-[#6b9aff]/10 mx-2" />

            <div className="p-1.5">
              <DropdownMenuItem 
                className="text-red-400 hover:text-red-300 hover:bg-gradient-to-r hover:from-red-500/15 hover:to-red-500/5 cursor-pointer rounded-lg px-3 py-2.5 transition-all duration-200 group"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                <span className="font-medium">Sign out</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}