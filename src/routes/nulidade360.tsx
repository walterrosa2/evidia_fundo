import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/nulidade360")({
  component: () => <Outlet />,
});
