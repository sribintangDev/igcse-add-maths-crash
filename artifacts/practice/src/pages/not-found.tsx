import { Link } from "wouter";
import { Compass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md border-card-border">
          <CardContent className="pt-8">
            <div className="mb-4 flex items-center gap-3">
              <Compass className="h-8 w-8 text-primary" />
              <h1 className="font-serif text-2xl font-semibold text-foreground">
                We can't find that page
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              The link you followed doesn't match any practice section. Head back to the dashboard
              to pick a topic and keep revising.
            </p>
            <div className="mt-6">
              <Button asChild data-testid="link-not-found-home">
                <Link href="/">Back to all sections</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
