import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import {
  Box,
  Button,
  Chip,
  Divider,
  InputBase,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import CardFormDialog from "../components/CardFormDialog";
import { TYPE_COLORS, type Card, type CardInput, type CardType } from "../types";

const KNOWLEDGE: CardType[] = ["concept", "standard", "adr"];
const GROUP_LABEL: Record<string, string> = {
  concept: "Concepts",
  standard: "Standards",
  adr: "Decisions (ADR)",
};

/** Replace [[CARD-ID]] with markdown links we can intercept on click. */
function resolveWikiLinks(body: string): string {
  return body.replace(/\[\[((?:EP|FT|US|CO|ST|AD)-\d{4})\]\]/g, "[$1](#card-$1)");
}

export default function WikiPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cardsQuery = useQuery({ queryKey: ["cards", slug], queryFn: () => api.getCards(slug) });

  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Card | undefined>();

  const cards = cardsQuery.data ?? [];
  const pages = useMemo(() => {
    const text = filter.trim().toLowerCase();
    return KNOWLEDGE.map((type) => ({
      type,
      items: cards
        .filter(
          (c) =>
            c.type === type &&
            (!text || c.id.toLowerCase().includes(text) || c.title.toLowerCase().includes(text)),
        )
        .sort((a, b) => a.id.localeCompare(b.id)),
    })).filter((g) => g.items.length > 0);
  }, [cards, filter]);

  const knowledgeCards = cards.filter((c) => KNOWLEDGE.includes(c.type));
  const selected =
    knowledgeCards.find((c) => c.id === selectedId) ?? knowledgeCards[0];

  const save = useMutation({
    mutationFn: (input: CardInput) =>
      editing ? api.updateCard(slug, editing.id, input) : api.createCard(slug, input),
    onSuccess: (card) => {
      queryClient.invalidateQueries({ queryKey: ["cards", slug] });
      queryClient.invalidateQueries({ queryKey: ["graph", slug] });
      setFormOpen(false);
      setSelectedId(card.id);
    },
  });

  const followLink = (id: string) => {
    const target = cards.find((c) => c.id === id);
    if (!target) return;
    if (KNOWLEDGE.includes(target.type)) setSelectedId(id);
    else navigate(`/shelf/${slug}?select=${id}`);
  };

  return (
    <Box sx={{ display: "flex", minHeight: 0, flexGrow: 1, overflow: "hidden" }}>
      <Box
        sx={{
          width: 280,
          flexShrink: 0,
          borderRight: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack direction="row" spacing={1} sx={{ p: 1, borderBottom: "1px solid", borderColor: "divider", alignItems: "center" }}>
          <InputBase
            placeholder="Filter pages…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            fullWidth
            sx={{
              fontSize: 13,
              px: 1,
              py: 0.25,
              bgcolor: "rgba(255,255,255,0.05)",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              "&.Mui-focused": { borderColor: "primary.main" },
            }}
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(undefined);
              save.reset();
              setFormOpen(true);
            }}
            sx={{ flexShrink: 0 }}
          >
            Page
          </Button>
        </Stack>
        <Box sx={{ overflow: "auto", flexGrow: 1, py: 0.5 }}>
          {pages.map((group) => (
            <Box key={group.type}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: "text.secondary", px: 1.5, pt: 1, pb: 0.25 }}>
                {GROUP_LABEL[group.type]?.toUpperCase()}
              </Typography>
              {group.items.map((c) => (
                <Box
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  sx={{
                    px: 1.5,
                    py: 0.6,
                    cursor: "pointer",
                    bgcolor: selected?.id === c.id ? "rgba(0,120,212,0.18)" : "transparent",
                    boxShadow: selected?.id === c.id ? "inset 2px 0 0 #0078d4" : "none",
                    "&:hover": { bgcolor: selected?.id === c.id ? "rgba(0,120,212,0.22)" : "rgba(255,255,255,0.04)" },
                  }}
                >
                  <Typography variant="body2" noWrap sx={{ fontSize: 13 }}>
                    {c.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: TYPE_COLORS[c.type] }}>
                    {c.id}
                  </Typography>
                </Box>
              ))}
            </Box>
          ))}
          {knowledgeCards.length === 0 && (
            <Typography color="text.secondary" variant="body2" sx={{ p: 2 }}>
              No wiki pages yet. Knowledge cards (concepts, standards, ADRs) are the pages your
              team — and its coding agents — share.
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: "auto", minWidth: 0 }}>
        {selected ? (
          <Box sx={{ maxWidth: 860, mx: "auto", px: 4, py: 3 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="overline" sx={{ color: TYPE_COLORS[selected.type], fontWeight: 700 }}>
                {selected.id} · {selected.type}
              </Typography>
              {selected.load && <Chip label={`agent load: ${selected.load}`} size="small" variant="outlined" />}
              <Box sx={{ flexGrow: 1 }} />
              <Button
                size="small"
                startIcon={<EditIcon />}
                variant="outlined"
                onClick={() => {
                  setEditing(selected);
                  save.reset();
                  setFormOpen(true);
                }}
              >
                Edit
              </Button>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
              {selected.title}
            </Typography>
            {selected.description && (
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {selected.description}
              </Typography>
            )}
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                "& h1": { fontSize: 26 },
                "& h2": { fontSize: 20, mt: 3 },
                "& h3": { fontSize: 17 },
                "& code": { bgcolor: "#16181d", px: 0.5, borderRadius: 0.5, fontSize: 13.5 },
                "& p, & li": { fontSize: 15, lineHeight: 1.7 },
                "& table": { borderCollapse: "collapse" },
                "& th, & td": { border: "1px solid", borderColor: "divider", px: 1.5, py: 0.5, fontSize: 14 },
                wordBreak: "break-word",
              }}
            >
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => {
                    const m = href?.match(/^#card-((?:EP|FT|US|CO|ST|AD)-\d{4})$/);
                    if (m) {
                      return (
                        <Link component="button" onClick={() => followLink(m[1] as string)} sx={{ fontWeight: 600 }}>
                          {children}
                        </Link>
                      );
                    }
                    return (
                      <Link href={href} target="_blank" rel="noreferrer">
                        {children}
                      </Link>
                    );
                  },
                }}
              >
                {resolveWikiLinks(selected.body || "*This page is empty — click Edit to write it.*")}
              </ReactMarkdown>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary">
              {selected.owner ? `owner: ${selected.owner} · ` : ""}updated {selected.updated} · ~
              {selected.tokens} tokens · served to agents via MCP
            </Typography>
          </Box>
        ) : (
          <Stack sx={{ alignItems: "center", justifyContent: "center", height: "100%" }}>
            <Typography color="text.secondary">Select or create a wiki page.</Typography>
          </Stack>
        )}
      </Box>

      <CardFormDialog
        open={formOpen}
        cards={cards}
        editing={editing}
        knowledgeOnly={!editing}
        error={save.isError ? (save.error as Error).message : undefined}
        busy={save.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={(input) => save.mutate(input)}
      />
    </Box>
  );
}
