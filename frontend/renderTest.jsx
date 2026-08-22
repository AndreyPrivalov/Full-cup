import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import App from "./src/App.jsx";

globalThis.window = {
  location: { hostname: "localhost" },
};

const queryClient = new QueryClient();

try {
  renderToString(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
  console.log("Render successful!");
} catch (e) {
  console.error("Render failed:");
  console.error(e);
}
