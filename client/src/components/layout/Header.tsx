import { useState } from "react";
import { 
  Search, 
  Bell, 
  User,
  ChevronDown
} from "lucide-react";

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header = ({ toggleSidebar }: HeaderProps) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

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
          
          <button className="relative text-white hover:text-gray-300">
            <Bell size={20} />
            <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-destructive text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              3
            </span>
          </button>
          
          <div className="relative">
            <button 
              onClick={toggleUserMenu}
              className="flex items-center space-x-1 focus:outline-none"
            >
              <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-white overflow-hidden">
                <User size={16} />
              </div>
              <span className="hidden md:inline text-sm font-medium text-white">Sarah Thompson</span>
              <ChevronDown className="hidden md:inline text-xs text-white" size={14} />
            </button>
            
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-zinc-900 rounded-md shadow-lg py-1 z-10 border border-zinc-800">
                <a href="#" className="block px-4 py-2 text-sm text-white hover:bg-zinc-800">
                  Your Profile
                </a>
                <a href="#" className="block px-4 py-2 text-sm text-white hover:bg-zinc-800">
                  Company Settings
                </a>
                <div className="border-t border-zinc-800 my-1"></div>
                <a href="#" className="block px-4 py-2 text-sm text-white hover:bg-zinc-800">
                  Sign out
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
