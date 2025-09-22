import { Link } from "wouter";
import { Bell, Settings, LogOut, User, Shield } from "lucide-react";
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

export default function Header() {
  const { user, logoutMutation } = useAuth();
  const { data: integratedData } = useIntegratedData();

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
    <header className="bg-[#0F172A] border-b border-[#334155] h-16 flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center space-x-4">
        <Link href="/">
          <div className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <img src={Logo} alt="Interlinc" className="h-8 w-auto object-contain" />
            <span className="font-semibold text-xl text-white">Interlinc</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="relative">
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
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
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.profileImageUrl || undefined} alt={getDisplayName()} />
                <AvatarFallback className="bg-zinc-800 text-white">
                  {getInitials(getDisplayName())}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-white">{getDisplayName()}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs leading-none text-zinc-400">{user?.email}</p>
                  <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                    {getRoleBadge()}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />

            <Link href="/settings">
              <DropdownMenuItem className="text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
            </Link>

            {user?.role === 'admin' && (
              <Link href="/admin">
                <DropdownMenuItem className="text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer">
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Admin Panel</span>
                </DropdownMenuItem>
              </Link>
            )}

            <DropdownMenuSeparator className="bg-zinc-800" />

            <DropdownMenuItem 
              className="text-red-400 hover:text-red-300 hover:bg-zinc-800 cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}