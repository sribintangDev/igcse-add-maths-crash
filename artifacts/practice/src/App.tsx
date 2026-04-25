import { Switch, Route, Router as WouterRouter } from "wouter";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Practice from "@/pages/Practice";
import TopicHome from "@/pages/TopicHome";
import McqPractice from "@/pages/McqPractice";
import { isSectionId } from "@/lib/storage";
import type { Level, TopicId } from "@/data/questions";

const TOPIC_IDS: TopicId[] = [
  "algebra",
  "surds",
  "quadratics",
  "differentiation",
  "integration",
  "trigonometry",
];
const LEVELS: Level[] = ["Basic", "Intermediate", "Advanced"];

function isTopicId(v: string): v is TopicId {
  return (TOPIC_IDS as string[]).includes(v);
}
function isLevel(v: string): v is Level {
  return (LEVELS as string[]).includes(v);
}

function PracticeRoute({ params }: { params: { section: string } }) {
  if (!isSectionId(params.section)) return <NotFound />;
  return <Practice sectionId={params.section} />;
}

function TopicHomeRoute({ params }: { params: { topicId: string } }) {
  if (!isTopicId(params.topicId)) return <NotFound />;
  return <TopicHome topicId={params.topicId} />;
}

function McqPracticeRoute({ params }: { params: { topicId: string; level: string } }) {
  if (!isTopicId(params.topicId)) return <NotFound />;
  if (!isLevel(params.level)) return <NotFound />;
  return <McqPractice topicId={params.topicId} level={params.level} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/practice/:section" component={PracticeRoute} />
      <Route path="/topic/:topicId" component={TopicHomeRoute} />
      <Route path="/topic/:topicId/:level/mcq" component={McqPracticeRoute} />
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
