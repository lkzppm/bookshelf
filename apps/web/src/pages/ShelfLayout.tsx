import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import ChecklistIcon from "@mui/icons-material/Checklist";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SourceIcon from "@mui/icons-material/Source";
import { AppBar, Box, IconButton, Toolbar, Tooltip, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

const NAV = [
  { to: "", label: "Graph", icon: <AccountTreeIcon fontSize="small" />, end: true },
  { to: "requirements", label: "Requirements", icon: <ChecklistIcon fontSize="small" />, end: false },
  { to: "wiki", label: "Wiki", icon: <MenuBookIcon fontSize="small" />, end: false },
];

/** Azure-DevOps-style project shell: top bar + left nav rail + routed content. */
export default function ShelfLayout() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const shelves = useQuery({ queryKey: ["shelves"], queryFn: api.listShelves });
  const shelf = shelves.data?.find((s) => s.slug === slug);

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <AppBar position="static" elevation={0}>
        <Toolbar variant="dense">
          <IconButton edge="start" onClick={() => navigate("/")} aria-label="back to shelves">
            <ArrowBackIcon />
          </IconButton>
          <AutoStoriesIcon sx={{ mx: 1, color: "primary.main" }} fontSize="small" />
          <Typography variant="h6">{shelf?.name ?? slug}</Typography>
          {shelf?.repo && (
            <Tooltip title={`Connected repository: ${shelf.repo.path}`}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  ml: 2,
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  color: "text.secondary",
                  fontSize: 12,
                }}
              >
                <SourceIcon sx={{ fontSize: 14 }} />
                {shelf.repo.name}
              </Box>
            </Tooltip>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
        <Box
          sx={{
            width: 168,
            flexShrink: 0,
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            pt: 1,
          }}
        >
          {NAV.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              style={{ textDecoration: "none" }}
            >
              {({ isActive }) => (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    px: 1.75,
                    py: 1,
                    mx: 0.75,
                    mb: 0.25,
                    borderRadius: 1,
                    color: isActive ? "primary.main" : "text.secondary",
                    bgcolor: isActive ? "rgba(0,120,212,0.12)" : "transparent",
                    boxShadow: isActive ? "inset 3px 0 0 #0078d4" : "none",
                    fontSize: 13.5,
                    fontWeight: isActive ? 600 : 500,
                    "&:hover": { bgcolor: isActive ? "rgba(0,120,212,0.16)" : "rgba(255,255,255,0.05)", color: isActive ? "primary.main" : "text.primary" },
                  }}
                >
                  {item.icon}
                  {item.label}
                </Box>
              )}
            </NavLink>
          ))}
        </Box>

        <Box sx={{ flexGrow: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
