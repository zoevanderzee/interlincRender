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
    <header className="bg-white border-b border-primary-200 shadow-sm sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-2 md:hidden">
          <div className="h-8 w-8 rounded bg-accent-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">CL</span>
          </div>
          <h1 className="text-xl font-semibold text-primary-900">Creativ Linc</h1>
        </div>
        
        <div className="flex-1 max-w-xl px-4 md:px-0 mx-auto hidden md:block">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-400">
              <Search size={16} />
            </span>
            <input 
              type="text" 
              placeholder="Search contracts, projects, or contractors..." 
              className="w-full pl-10 pr-4 py-2 border border-primary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="md:hidden text-primary-500 hover:text-primary-700">
            <Search size={20} />
          </button>
          
          <button className="relative text-primary-500 hover:text-primary-700">
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
              <div className="h-8 w-8 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 overflow-hidden">
                <User size={16} />
              </div>
              <span className="hidden md:inline text-sm font-medium text-primary-700">Sarah Thompson</span>
              <ChevronDown className="hidden md:inline text-xs text-primary-500" size={14} />
            </button>
            
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                <a href="#" className="block px-4 py-2 text-sm text-primary-700 hover:bg-primary-50">
                  Your Profile
                </a>
                <a href="#" className="block px-4 py-2 text-sm text-primary-700 hover:bg-primary-50">
                  Company Settings
                </a>
                <div className="border-t border-primary-200 my-1"></div>
                <a href="#" className="block px-4 py-2 text-sm text-primary-700 hover:bg-primary-50">
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
