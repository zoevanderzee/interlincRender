
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TestInterlincV2() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Interlinc Connect V2 Test Page</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">This is a test page to verify the V2 component works.</p>
            <Button onClick={() => window.location.href = '/interlinc-connect-v2'}>
              Go to Full V2 Interface
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
