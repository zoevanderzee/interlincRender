
import React from 'react';

// V1 has been completely removed - redirect to V2
export default function InterlincConnect() {
  React.useEffect(() => {
    window.location.href = '/interlinc-connect-v2';
  }, []);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Redirecting to V2...</h2>
        <p className="text-muted-foreground">V1 Connect has been removed. Redirecting to V2 interface.</p>
      </div>
    </div>
  );
}
