import { createFileRoute } from "@tanstack/react-router";
import { BriarGame } from "@/components/briar-game";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <BriarGame />;
}
