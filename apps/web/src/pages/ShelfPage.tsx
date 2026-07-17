import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import CardFormDialog from "../components/CardFormDialog";
import CardPanel from "../components/CardPanel";
import GraphView from "../components/GraphView";
import {
  CARD_TYPES,
  EDGE_STYLES,
  TYPE_COLORS,
  type Card,
  type CardInput,
  type CardType,
} from "../types";

const SIDEBAR_W = 320;
const PANEL_W = 420;
const ALL_EDGE_TYPES = Object.keys(EDGE_STYLES);

export default function ShelfPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const cardsQuery = useQuery({ queryKey: ["cards", slug], queryFn: () => api.getCards(slug) });
  const graphQuery = useQuery({ queryKey: ["graph", slug], queryFn: () => api.getGraph(slug) });

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [filterText, setFilterText] = useState("");
  const [filterType, setFilterType] = useState<CardType | "all">("all");
  const [visibleEdges, setVisibleEdges] = useState<Set<string>>(new Set(ALL_EDGE_TYPES));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Card | undefined>();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["cards", slug] });
    queryClient.invalidateQueries({ queryKey: ["graph", slug] });
    queryClient.invalidateQueries({ queryKey: ["shelves"] });
  };

  const save = useMutation({
    mutationFn: (input: CardInput) =>
      editing ? api.updateCard(slug, editing.id, input) : api.createCard(slug, input),
    onSuccess: (card) => {
      invalidate();
      setFormOpen(false);
      setSelectedId(card.id);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteCard(slug, id),
    onSuccess: () => {
      invalidate();
      setSelectedId(undefined);
    },
  });

  const cards = cardsQuery.data ?? [];
  const selected = cards.find((c) => c.id === selectedId);

  const filtered = useMemo(() => {
    const text = filterText.toLowerCase();
    return cards
      .filter((c) => filterType === "all" || c.type === filterType)
      .filter(
        (c) =>
          !text ||
          c.id.toLowerCase().includes(text) ||
          c.title.toLowerCase().includes(text) ||
          c.tags.some((t) => t.toLowerCase().includes(text)),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [cards, filterText, filterType]);

  const toggleEdge = (type: string) => {
    setVisibleEdges((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: "background.paper" }}>
        <Toolbar variant="dense">
          <IconButton edge="start" onClick={() => navigate("/")} aria-label="back to shelves">
            <ArrowBackIcon />
          </IconButton>
          <AutoStoriesIcon sx={{ mx: 1, color: "primary.main" }} fontSize="small" />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            {slug}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ mr: 2 }}>
            {ALL_EDGE_TYPES.map((t) => (
              <Chip
                key={t}
                label={EDGE_STYLES[t as keyof typeof EDGE_STYLES].label}
                size="small"
                variant={visibleEdges.has(t) ? "filled" : "outlined"}
                onClick={() => toggleEdge(t)}
                sx={{
                  borderColor: EDGE_STYLES[t as keyof typeof EDGE_STYLES].stroke,
                  ...(visibleEdges.has(t)
                    ? { bgcolor: EDGE_STYLES[t as keyof typeof EDGE_STYLES].stroke, color: "#0f1117" }
                    : {}),
                }}
              />
            ))}
          </Stack>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(undefined);
              save.reset();
              setFormOpen(true);
            }}
          >
            New card
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, display: "flex", minHeight: 0 }}>
        <Box
          sx={{
            width: SIDEBAR_W,
            borderRight: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stack direction="row" spacing={1} sx={{ p: 1.5 }}>
            <TextField
              size="small"
              placeholder="Filter…"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              fullWidth
            />
            <TextField
              size="small"
              select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as CardType | "all")}
              sx={{ minWidth: 110 }}
            >
              <MenuItem value="all">all types</MenuItem>
              {CARD_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <List dense sx={{ overflow: "auto", flexGrow: 1, pt: 0 }}>
            {filtered.map((c) => (
              <ListItemButton
                key={c.id}
                selected={c.id === selectedId}
                onClick={() => setSelectedId(c.id)}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: TYPE_COLORS[c.type],
                    mr: 1.2,
                    flexShrink: 0,
                  }}
                />
                <ListItemText
                  primary={`${c.id} — ${c.title}`}
                  secondary={`${c.type} · ${c.status}`}
                  slotProps={{
                    primary: { sx: { fontSize: 13 }, noWrap: true },
                    secondary: { sx: { fontSize: 11 } },
                  }}
                />
              </ListItemButton>
            ))}
            {filtered.length === 0 && (
              <Typography color="text.secondary" variant="body2" sx={{ p: 2 }}>
                No cards match.
              </Typography>
            )}
          </List>
        </Box>

        <Box sx={{ flexGrow: 1, position: "relative" }}>
          {graphQuery.isLoading && (
            <Stack sx={{ alignItems: "center", justifyContent: "center", height: "100%" }}>
              <CircularProgress />
            </Stack>
          )}
          {graphQuery.isError && (
            <Alert severity="error" sx={{ m: 2 }}>
              {(graphQuery.error as Error).message}
            </Alert>
          )}
          {graphQuery.data && (
            <GraphView
              graph={graphQuery.data}
              selectedId={selectedId}
              visibleEdgeTypes={visibleEdges}
              onSelect={setSelectedId}
            />
          )}
        </Box>

        <Drawer
          anchor="right"
          open={!!selected}
          onClose={() => setSelectedId(undefined)}
          variant="persistent"
          sx={{
            width: selected ? PANEL_W : 0,
            flexShrink: 0,
            "& .MuiDrawer-paper": { width: PANEL_W, position: "relative", border: "none" },
          }}
        >
          {selected && graphQuery.data && (
            <CardPanel
              card={selected}
              graph={graphQuery.data}
              onClose={() => setSelectedId(undefined)}
              onEdit={() => {
                setEditing(selected);
                save.reset();
                setFormOpen(true);
              }}
              onDelete={() => remove.mutate(selected.id)}
              onSelect={setSelectedId}
            />
          )}
        </Drawer>
      </Box>

      <CardFormDialog
        open={formOpen}
        cards={cards}
        editing={editing}
        error={save.isError ? (save.error as Error).message : undefined}
        busy={save.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={(input) => save.mutate(input)}
      />
    </Box>
  );
}
