import {
  Alert,
  Autocomplete,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  CARD_STATUSES,
  CARD_TYPES,
  type Card,
  type CardInput,
  type CardType,
} from "../types";

const PARENT_TYPE: Partial<Record<CardType, CardType>> = { story: "feature", feature: "epic" };

export interface CardFormDialogProps {
  open: boolean;
  cards: Card[];
  /** When set, the dialog edits this card; otherwise it creates a new one. */
  editing?: Card;
  error?: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: CardInput) => void;
}

export default function CardFormDialog({
  open,
  cards,
  editing,
  error,
  busy,
  onClose,
  onSubmit,
}: CardFormDialogProps) {
  const [type, setType] = useState<CardType>("story");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Card["status"]>("draft");
  const [parent, setParent] = useState<string | null>(null);
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [relatesTo, setRelatesTo] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!open) return;
    setType(editing?.type ?? "story");
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setStatus(editing?.status ?? "draft");
    setParent(editing?.links.parent ?? null);
    setDependsOn(editing?.links["depends-on"] ?? []);
    setRelatesTo(editing?.links["relates-to"] ?? []);
    setTags(editing?.tags ?? []);
    setBody(editing?.body ?? "");
  }, [open, editing]);

  const parentType = PARENT_TYPE[type];
  const parentOptions = cards.filter((c) => c.type === parentType).map((c) => c.id);
  const linkOptions = cards.filter((c) => c.id !== editing?.id).map((c) => c.id);
  const cardLabel = (id: string) => {
    const c = cards.find((x) => x.id === id);
    return c ? `${c.id} — ${c.title}` : id;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{editing ? `Edit ${editing.id}` : "New card"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="Type"
              value={type}
              onChange={(e) => {
                setType(e.target.value as CardType);
                setParent(null);
              }}
              disabled={!!editing}
              sx={{ minWidth: 140 }}
            >
              {CARD_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Card["status"])}
              sx={{ minWidth: 140 }}
            >
              {CARD_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              autoFocus={!editing}
            />
          </Stack>

          <TextField
            label="One-line description (used in maps & summaries)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
          />

          {parentType && (
            <Autocomplete
              options={parentOptions}
              value={parent}
              onChange={(_e, v) => setParent(v)}
              getOptionLabel={cardLabel}
              renderInput={(params) => (
                <TextField {...params} label={`Parent ${parentType}`} placeholder="none" />
              )}
            />
          )}

          <Stack direction="row" spacing={2}>
            <Autocomplete
              multiple
              options={linkOptions}
              value={dependsOn}
              onChange={(_e, v) => setDependsOn(v)}
              getOptionLabel={cardLabel}
              renderInput={(params) => <TextField {...params} label="Depends on" />}
              sx={{ flex: 1 }}
            />
            <Autocomplete
              multiple
              options={linkOptions}
              value={relatesTo}
              onChange={(_e, v) => setRelatesTo(v)}
              getOptionLabel={cardLabel}
              renderInput={(params) => <TextField {...params} label="Relates to" />}
              sx={{ flex: 1 }}
            />
          </Stack>

          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={tags}
            onChange={(_e, v) => setTags(v as string[])}
            renderInput={(params) => (
              <TextField {...params} label="Tags" placeholder="type and press enter" />
            )}
          />

          <TextField
            label="Body (markdown — use [[CARD-ID]] to link other cards)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            fullWidth
            multiline
            minRows={8}
            slotProps={{ input: { sx: { fontFamily: "monospace", fontSize: 14 } } }}
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!title.trim() || busy}
          onClick={() =>
            onSubmit({
              type,
              title: title.trim(),
              description: description.trim() || undefined,
              status,
              tags,
              links: {
                ...(parent ? { parent } : {}),
                "depends-on": dependsOn,
                "relates-to": relatesTo,
              },
              body,
            })
          }
        >
          {editing ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
