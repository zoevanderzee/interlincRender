import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function InterlincConnect() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Interlinc Connect</CardTitle>
            <CardDescription>
              Set up your payment processing and business verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Ready for fresh implementation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}