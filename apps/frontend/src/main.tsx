import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import ConfigProvider from "antd/es/config-provider";
import AntApp from "antd/es/app";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: "#1890ff",
              },
            }}
          >
            <AntApp>
              <App />
            </AntApp>
          </ConfigProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </React.StrictMode>
  );
}
