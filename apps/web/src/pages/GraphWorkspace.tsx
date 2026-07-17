import AddIcon from "@mui/icons-material/Add";
import { Alert, Box, Button, CircularProgress, Drawer, Stack } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import CardFormDialog from "../components/CardFormDialog";
import CardPanel from "../components/CardPanel";
import EdgeFilter from "../components/EdgeFilter";
import Explorer from "../components/Explorer";
import GraphView from "../components/GraphView";
import { EDGE_STYLES, type Card, type CardInput } from "../types";

const SIDEBAR_W = 300;
const PANEL_W = 420;

export default function GraphWorkspace() {
  const { slug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const cardsQuery = useQuery({ queryKey: ["cards", slug], queryFn: () => api.getCards(slug) });
  const graphQuery = useQuery({ queryKey: ["graph", slug], queryFn: () => api.getGraph(slug) });

  const [selectedId, setSelectedIdState] = useState<string | undefined>(
    searchParams.get("select") ?? undefined,
  );
  const setSelectedId = (id: string | undefined) => {
    setSelectedIdState(id);
    if (searchParams.get("select")) setSearchParams({}, { replace: true });
  };
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
    <>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          px: 1.5,
          py: 0.75,
          borderBottom: "1px solid",
          borderColor: "divider",
          justifyContent: "flex-end",
        }}
      >
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

      <Box sx={{ flexGrow: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
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

        <Box sx={{ flexGrow: 1, position: "relative", minWidth: 0 }}>
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
    </>
  );
}
