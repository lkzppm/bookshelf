import { Route, Routes } from "react-router-dom";
import GraphWorkspace from "./pages/GraphWorkspace";
import RequirementsPage from "./pages/RequirementsPage";
import ShelfLayout from "./pages/ShelfLayout";
import ShelvesPage from "./pages/ShelvesPage";
import WikiPage from "./pages/WikiPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ShelvesPage />} />
      <Route path="/shelf/:slug" element={<ShelfLayout />}>
        <Route index element={<GraphWorkspace />} />
        <Route path="requirements" element={<RequirementsPage />} />
        <Route path="wiki" element={<WikiPage />} />
      </Route>
    </Routes>
  );
}
