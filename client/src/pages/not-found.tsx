import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, ArrowLeft, Layers } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black">
      <Card className="w-full max-w-md mx-4 border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-2">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-7 w-7 text-yellow-500" />
            <CardTitle className="text-2xl font-bold text-white">Page Not Found</CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          <div className="space-y-4">
            <div className="text-4xl font-bold text-center bg-gradient-to-r from-red-500 to-yellow-500 text-transparent bg-clip-text">
              404
            </div>
            
            <p className="text-gray-400 text-center">
              The page you are looking for doesn't exist or has been moved.
            </p>
            
            <div className="mt-2 p-4 bg-zinc-800 rounded-md border border-zinc-700">
              <h3 className="text-sm font-medium text-white mb-2">Possible reasons:</h3>
              <ul className="text-sm text-gray-400 space-y-1 list-disc pl-5">
                <li>The URL might be incorrect</li>
                <li>The page may have been removed</li>
                <li>You might not have permission to view this page</li>
                <li>There might be a temporary system error</li>
              </ul>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2 pt-0">
          <Link href="/">
            <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white">
              <Home className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Button>
          </Link>
          
          <div className="flex space-x-2 w-full">
            <Button 
              variant="outline" 
              className="flex-1 border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:text-white"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            
            <Link href="/contracts">
              <Button 
                variant="outline" 
                className="flex-1 border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:text-white"
              >
                <Layers className="mr-2 h-4 w-4" />
                View Contracts
              </Button>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
