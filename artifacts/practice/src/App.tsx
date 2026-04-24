import { Switch, Route, Router as WouterRouter } from "wouter";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Practice from "@/pages/Practice";
import { isSectionId } from "@/lib/storage";

function PracticeRoute({ params }: { params: { section: string } }) {
  if (!isSectionId(params.section)) return <NotFound />;
  return <Practice sectionId={params.section} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/practice/:section" component={PracticeRoute} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}

export default App;
