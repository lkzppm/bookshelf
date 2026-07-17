import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import CardFormDialog from "../components/CardFormDialog";
import CardPanel from "../components/CardPanel";
import EdgeFilter from "../components/EdgeFilter";
import Explorer from "../components/Explorer";
import GraphView from "../components/GraphView";
import { EDGE_STYLES, type Card, type CardInput } from "../types";

const SIDEBAR_W = 300;
const PANEL_W = 420;

export default function ShelfPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const cardsQuery = useQuery({ queryKey: ["cards", slug], queryFn: () => api.getCards(slug) });
  const graphQuery = useQuery({ queryKey: ["graph", slug], queryFn: () => api.getGraph(slug) });

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [visibleEdges, setVisibleEdges] = useState<Set<string>>(new Set(Object.keys(EDGE_STYLES)));
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

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static" elevation={0}>
        <Toolbar variant="dense">
          <IconButton edge="start" onClick={() => navigate("/")} aria-label="back to shelves">
            <ArrowBackIcon />
          </IconButton>
          <AutoStoriesIcon sx={{ mx: 1, color: "primary.main" }} fontSize="small" />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {slug}
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <EdgeFilter visible={visibleEdges} onChange={setVisibleEdges} />
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
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, display: "flex", minHeight: 0 }}>
        <Box
          sx={{
            width: SIDEBAR_W,
            flexShrink: 0,
            borderRight: "1px solid",
            borderColor: "divider",
            minHeight: 0,
          }}
        >
          <Explorer cards={cards} selectedId={selectedId} onSelect={setSelectedId} />
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
            "& .MuiDrawer-paper": {
              width: PANEL_W,
              position: "relative",
              borderLeft: "1px solid",
              borderColor: "divider",
            },
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
