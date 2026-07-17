import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#0078d4" },
    secondary: { main: "#00bcf2" },
    background: { default: "#16181d", paper: "#1d2027" },
    divider: "rgba(255,255,255,0.08)",
    text: { primary: "#f3f4f6", secondary: "#9ba1ab" },
  },
  typography: {
    fontFamily: '"Segoe UI", "Inter", system-ui, -apple-system, sans-serif',
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 4 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#1d2027",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backgroundImage: "none",
        },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 4 } } },
  },
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
