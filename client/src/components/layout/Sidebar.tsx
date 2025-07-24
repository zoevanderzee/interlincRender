import { Link, useLocation } from "wouter";
import logoImage from "../../assets/CD_icon_light@2x.png"; // Will keep using the same image file
import { useAuth } from "@/hooks/use-auth";

interface SidebarProps {
  isOpen: boolean;
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  closeMobileMenu: () => void;
}

const Sidebar = ({ isOpen, isMobileOpen, toggleSidebar, closeMobileMenu }: SidebarProps) => {
  const [location] = useLocation();
  const { user } = useAuth();
  const isContractor = user?.role === "contractor";

  // Check if a nav link is active
  const isActive = (path: string) => {
    return location === path;
  };

  // For mobile display
  if (!isOpen && !isMobileOpen) {
    return (
      <div className="hidden md:flex flex-col bg-black border-r border-zinc-800 w-16 overflow-y-auto transition-all duration-300 ease-in-out">
        <div className="flex justify-center py-4 border-b border-zinc-800">
          <img src={logoImage} alt="Creativ Linc Logo" className="h-8" />
        </div>
        
        <nav className="py-4 flex flex-col h-full">
          <ul className="space-y-4">
            <li className="relative group">
              <div className={`flex justify-center px-2 py-3 rounded-md ${isActive("/") ? "text-accent-600 bg-accent-50" : "text-primary-600 hover:bg-primary-50"}`}>
                <Link href="/">
                  <svg xmlns="http://www.w3.org/2000/svg" className="text-lg w-5 h-5" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="9"></rect>
                    <rect x="14" y="3" width="7" height="5"></rect>
                    <rect x="14" y="12" width="7" height="9"></rect>
                    <rect x="3" y="16" width="7" height="5"></rect>
                  </svg>
                </Link>
              </div>
              <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute left-full ml-2 px-2 py-1 bg-primary-800 text-white text-xs rounded transition-opacity whitespace-nowrap">
                Dashboard
              </div>
            </li>
            <li className="relative group">
              <div className={`flex justify-center px-2 py-3 rounded-md ${isActive("/projects") ? "text-accent-600 bg-accent-50" : "text-primary-600 hover:bg-primary-50"}`}>
                <Link href="/projects">
                  <svg xmlns="http://www.w3.org/2000/svg" className="text-lg w-5 h-5" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                </Link>
              </div>
              <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute left-full ml-2 px-2 py-1 bg-primary-800 text-white text-xs rounded transition-opacity whitespace-nowrap">
                {isContractor ? "Assignments" : "Projects"}
              </div>
            </li>

            <li className="relative group">
              <div className={`flex justify-center px-2 py-3 rounded-md ${isActive("/contractors") ? "text-accent-600 bg-accent-50" : "text-primary-600 hover:bg-primary-50"}`}>
                <Link href="/contractors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="text-lg w-5 h-5" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </Link>
              </div>
              <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute left-full ml-2 px-2 py-1 bg-primary-800 text-white text-xs rounded transition-opacity whitespace-nowrap">
                {isContractor ? "Companies" : "Contractors"}
              </div>
            </li>
            
            <li className="relative group">
              <div className={`flex justify-center px-2 py-3 rounded-md ${isActive("/connections") ? "text-accent-600 bg-accent-50" : "text-primary-600 hover:bg-primary-50"}`}>
                <Link href="/connections">
                  <svg xmlns="http://www.w3.org/2000/svg" className="text-lg w-5 h-5" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 17a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3"></path>
                    <path d="M13 7H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3"></path>
                    <path d="M10 15V9"></path>
                    <path d="M17 15V9"></path>
                    <path d="M13 13h4"></path>
                    <path d="M13 11h4"></path>
                  </svg>
                </Link>
              </div>
              <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute left-full ml-2 px-2 py-1 bg-primary-800 text-white text-xs rounded transition-opacity whitespace-nowrap">
                Connections
              </div>
            </li>
            <li className="relative group">
              <div className={`flex justify-center px-2 py-3 rounded-md ${isActive("/payments") ? "text-accent-600 bg-accent-50" : "text-primary-600 hover:bg-primary-50"}`}>
                <Link href="/payments">
                  <svg xmlns="http://www.w3.org/2000/svg" className="text-lg w-5 h-5" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </Link>
              </div>
              <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute left-full ml-2 px-2 py-1 bg-primary-800 text-white text-xs rounded transition-opacity whitespace-nowrap">
                Payments
              </div>
            </li>
          </ul>
          
          <div className="mt-auto">
            <button 
              onClick={toggleSidebar}
              className="w-full flex justify-center py-2 text-primary-500 hover:text-primary-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="13 17 18 12 13 7"></polyline>
                <polyline points="6 17 11 12 6 7"></polyline>
              </svg>
            </button>
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className={`
      ${isMobileOpen ? "fixed inset-y-0 left-0 z-30" : "hidden md:flex"} 
      flex-col bg-black border-r border-zinc-800 w-64 overflow-y-auto transition-all duration-300 ease-in-out
    `}>
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center">
          <img src={logoImage} alt="Creativ Linc Logo" className="h-8" />
        </div>
        
        <button 
          onClick={isMobileOpen ? closeMobileMenu : toggleSidebar}
          className="text-white hover:text-gray-400"
          aria-label={isMobileOpen ? "Close sidebar" : "Collapse sidebar"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>
      
      <nav className="py-4 flex flex-col h-full">
        <div className="px-4 mb-4">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider">Core</h2>
          <ul className="mt-2 space-y-1">
            <li>
              <Link 
                href="/" 
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive("/") ? "bg-zinc-800 text-white" : "text-white hover:bg-zinc-800"}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="9"></rect>
                  <rect x="14" y="3" width="7" height="5"></rect>
                  <rect x="14" y="12" width="7" height="9"></rect>
                  <rect x="3" y="16" width="7" height="5"></rect>
                </svg>
                Dashboard
              </Link>
            </li>
            <li>
              <Link 
                href="/projects" 
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive("/projects") ? "bg-zinc-800 text-white" : "text-white hover:bg-zinc-800"}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                {isContractor ? "Assignments" : "Projects"}
              </Link>
            </li>

            <li>
              <Link 
                href="/contractors" 
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive("/contractors") ? "bg-zinc-800 text-white" : "text-white hover:bg-zinc-800"}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                {isContractor ? "Companies" : "Contractors"}
              </Link>
            </li>
            
            {isContractor && (
              <li>
                <Link 
                  href="/contractor-requests" 
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive("/contractor-requests") ? "bg-zinc-800 text-white" : "text-white hover:bg-zinc-800"}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    <path d="M12 11h4"></path>
                    <path d="M12 16h4"></path>
                    <path d="M8 11h.01"></path>
                    <path d="M8 16h.01"></path>
                  </svg>
                  Work Requests
                </Link>
              </li>
            )}
          </ul>
        </div>
        
        <div className="px-4 mb-4">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider">Finance</h2>
          <ul className="mt-2 space-y-1">
            {!isContractor && (
              <li>
                <Link 
                  href="/wallet" 
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive("/wallet") ? "bg-zinc-800 text-white" : "text-white hover:bg-zinc-800"}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                  Wallet
                </Link>
              </li>
            )}
            
            {isContractor && (
              <li>
                <Link 
                  href="/payment-setup" 
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive("/payment-setup") ? "bg-zinc-800 text-white" : "text-white hover:bg-zinc-800"}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                  Payment Setup
                </Link>
              </li>
            )}
            <li>
              <Link 
                href="/payments" 
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive("/payments") ? "bg-zinc-800 text-white" : "text-white hover:bg-zinc-800"}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Payments
              </Link>
            </li>
            <li>
              <Link 
                href="/reports" 
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive("/reports") ? "bg-zinc-800 text-white" : "text-white hover:bg-zinc-800"}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                Reports
              </Link>
            </li>
          </ul>
        </div>
        
        <div className="px-4 mb-4">
          <h2 className="text-xs font-semibold text-white uppercase tracking-wider">Documents</h2>
          <ul className="mt-2 space-y-1">
            <li>
              <Link 
                href="/data-room" 
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive("/data-room") ? "bg-zinc-800 text-white" : "text-white hover:bg-zinc-800"}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                Data Room
              </Link>
            </li>
          </ul>
        </div>
        
        <div className="mt-auto px-4">
          <div className="pt-4 border-t border-zinc-800">
            <Link 
              href="/settings" 
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive("/settings") ? "bg-zinc-800 text-white" : "text-white hover:bg-zinc-800"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Settings
            </Link>
            <Link 
              href="/help" 
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${isActive("/help") ? "bg-zinc-800 text-white" : "text-white hover:bg-zinc-800"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              Help & Support
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
