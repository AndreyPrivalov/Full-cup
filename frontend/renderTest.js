globalThis.window = {
  location: { hostname: "localhost" },
};

const React = await import("react");
const { renderToString } = await import("react-dom/server");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { default: App } = await import("./src/App.jsx");

const queryClient = new QueryClient();

try {
  renderToString(
    React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(App)),
  );
  console.log("Render successful!");
} catch (e) {
  console.error("Render failed:");
  console.error(e);
}
