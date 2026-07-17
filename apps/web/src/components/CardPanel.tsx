import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditIcon from "@mui/icons-material/Edit";
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import ReactMarkdown from "react-markdown";
import {
  PRIORITY_COLORS,
  STATUS_COLORS,
  TYPE_COLORS,
  statusTextColor,
  type Card,
  type ShelfGraph,
} from "../types";

export interface CardPanelProps {
  card: Card;
  graph: ShelfGraph;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: (id: string) => void;
}

export default function CardPanel({ card, graph, onClose, onEdit, onDelete, onSelect }: CardPanelProps) {
  const titles = new Map(graph.nodes.map((n) => [n.id, n.title]));
  const outgoing = graph.edges.filter((e) => e.from === card.id);
  const incoming = graph.edges.filter((e) => e.to === card.id);

  const connection = (id: string, label: string, key: string) => (
    <Stack direction="row" spacing={1} key={key} sx={{ alignItems: "baseline" }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 86 }}>
        {label}
      </Typography>
      <Link component="button" variant="body2" onClick={() => onSelect(id)} sx={{ textAlign: "left" }}>
        {id} — {titles.get(id) ?? "?"}
      </Link>
    </Stack>
  );

  return (
    <Box sx={{ p: 2.5, height: "100%", overflow: "auto" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography variant="overline" sx={{ color: TYPE_COLORS[card.type], fontWeight: 700 }}>
          {card.id} · {card.type}
        </Typography>
        <Chip
          label={card.status}
          size="small"
          sx={{ bgcolor: STATUS_COLORS[card.status], color: statusTextColor(card.status), fontWeight: 700 }}
        />
        {card.load && <Chip label={`load: ${card.load}`} size="small" variant="outlined" />}
        <Box sx={{ flexGrow: 1 }} />
        <IconButton size="small" onClick={onClose} aria-label="close panel">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
        {card.title}
      </Typography>
      {card.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {card.description}
        </Typography>
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap" }}>
        {card.priority && (
          <Chip
            label={`priority: ${card.priority}`}
            size="small"
            sx={{ bgcolor: PRIORITY_COLORS[card.priority], color: "#fff", fontWeight: 700 }}
          />
        )}
        {card.effort !== undefined && <Chip label={`${card.effort} pts`} size="small" variant="outlined" />}
        {card.iteration && <Chip label={card.iteration} size="small" variant="outlined" />}
        {card.due && <Chip label={`due ${card.due}`} size="small" variant="outlined" />}
        {card.owner && <Chip label={`@${card.owner}`} size="small" variant="outlined" />}
        {card.tags.map((t) => (
          <Chip key={t} label={t} size="small" variant="outlined" />
        ))}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button size="small" startIcon={<EditIcon />} variant="outlined" onClick={onEdit}>
          Edit
        </Button>
        <Button
          size="small"
          startIcon={<DeleteOutlineIcon />}
          color="error"
          variant="outlined"
          onClick={() => {
            if (window.confirm(`Delete ${card.id} — "${card.title}"?`)) onDelete();
          }}
        >
          Delete
        </Button>
      </Stack>

      {(outgoing.length > 0 || incoming.length > 0) && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Connections
          </Typography>
          <Stack spacing={0.5}>
            {outgoing.map((e, i) => connection(e.to, `${e.type} →`, `o${i}`))}
            {incoming.map((e, i) => connection(e.from, `← ${e.type}`, `i${i}`))}
          </Stack>
        </>
      )}

      <Divider sx={{ my: 2 }} />
      <Box
        sx={{
          "& h1": { fontSize: 22 },
          "& h2": { fontSize: 18 },
          "& h3": { fontSize: 16 },
          "& code": { bgcolor: "#16181d", px: 0.5, borderRadius: 0.5, fontSize: 13 },
          "& p, & li": { fontSize: 14, lineHeight: 1.6 },
          wordBreak: "break-word",
        }}
      >
        {card.body ? (
          <ReactMarkdown>{card.body}</ReactMarkdown>
        ) : (
          <Typography color="text.secondary" variant="body2">
            (empty body)
          </Typography>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary">
        {card.owner ? `owner: ${card.owner} · ` : ""}created {card.created} · updated {card.updated} · ~
        {card.tokens} tokens
      </Typography>
    </Box>
  );
}
