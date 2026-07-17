import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LinkIcon from "@mui/icons-material/Link";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import SyncIcon from "@mui/icons-material/Sync";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import {
  PRIORITY_COLORS,
  STATE_COLORS,
  TYPE_COLORS,
  type Card,
  type CodeLink,
  type RequirementState,
  type TraceData,
} from "../types";

interface Row {
  card: Card;
  depth: number;
  children: Row[];
  state: RequirementState;
  links: CodeLink[];
}

function stateIcon(state: RequirementState, size = 18) {
  const sx = { fontSize: size, color: STATE_COLORS[state] };
  if (state === "checked") return <CheckCircleIcon sx={sx} />;
  if (state === "stale") return <ReportProblemIcon sx={sx} />;
  return <RadioButtonUncheckedIcon sx={sx} />;
}

/** Roll a parent up from its children: any stale → stale; all checked → checked. */
function rollup(children: Row[], own: RequirementState, hasOwnLinks: boolean): RequirementState {
  if (hasOwnLinks) return own;
  if (children.length === 0) return "unchecked";
  if (children.some((c) => c.state === "stale")) return "stale";
  return children.every((c) => c.state === "checked") ? "checked" : "unchecked";
}

function buildRows(cards: Card[], trace: TraceData | undefined): Row[] {
  const product = cards.filter((c) => ["epic", "feature", "story"].includes(c.type));
  const byId = new Map<string, Row>(
    product.map((c) => {
      const t = trace?.cards[c.id];
      return [
        c.id,
        { card: c, depth: 0, children: [], state: t?.state ?? "unchecked", links: t?.links ?? [] },
      ];
    }),
  );
  const roots: Row[] = [];
  for (const row of byId.values()) {
    const parent = row.card.links.parent ? byId.get(row.card.links.parent) : undefined;
    if (parent) parent.children.push(row);
    else roots.push(row);
  }
  const finalize = (rows: Row[], depth: number) => {
    rows.sort((a, b) => a.card.id.localeCompare(b.card.id));
    for (const row of rows) {
      row.depth = depth;
      finalize(row.children, depth + 1);
      row.state = rollup(row.children, row.state, row.links.length > 0);
    }
  };
  finalize(roots, 0);
  return roots;
}

function countStates(rows: Row[]): Record<RequirementState, number> {
  const counts: Record<RequirementState, number> = { checked: 0, stale: 0, unchecked: 0 };
  const visit = (row: Row) => {
    if (row.card.type === "story") counts[row.state]++;
    row.children.forEach(visit);
  };
  rows.forEach(visit);
  return counts;
}

export default function RequirementsPage() {
  const { slug = "" } = useParams();
  const queryClient = useQueryClient();

  const cardsQuery = useQuery({ queryKey: ["cards", slug], queryFn: () => api.getCards(slug) });
  const traceQuery = useQuery({ queryKey: ["trace", slug], queryFn: () => api.getTrace(slug) });

  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
  const [expandedLinks, setExpandedLinks] = useState<Set<string>>(new Set());
  const [repoDialog, setRepoDialog] = useState(false);
  const [repoPath, setRepoPath] = useState("");
  const [repoName, setRepoName] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["trace", slug] });
    queryClient.invalidateQueries({ queryKey: ["shelves"] });
  };

  const connect = useMutation({
    mutationFn: () => api.setRepo(slug, repoPath.trim(), repoName.trim() || undefined),
    onSuccess: () => {
      setRepoDialog(false);
      invalidate();
    },
  });
  const scan = useMutation({ mutationFn: () => api.scan(slug), onSuccess: invalidate });
  const review = useMutation({
    mutationFn: (id: string) => api.reviewCard(slug, id),
    onSuccess: invalidate,
  });

  const trace = traceQuery.data;
  const rows = useMemo(
    () => buildRows(cardsQuery.data ?? [], trace),
    [cardsQuery.data, trace],
  );
  const counts = useMemo(() => countStates(rows), [rows]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const renderRow = (row: Row): React.ReactNode => {
    const open = !collapsedRows.has(row.card.id);
    const linksOpen = expandedLinks.has(row.card.id);
    const c = row.card;
    return (
      <Box key={c.id}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            pl: 1 + row.depth * 3,
            pr: 2,
            py: 0.9,
            borderBottom: "1px solid",
            borderColor: "divider",
            "&:hover": { bgcolor: "rgba(255,255,255,0.03)" },
          }}
        >
          {row.children.length > 0 ? (
            <Box
              onClick={() => toggle(collapsedRows, setCollapsedRows, c.id)}
              sx={{ display: "flex", cursor: "pointer", color: "text.secondary" }}
            >
              {open ? <ExpandMoreIcon sx={{ fontSize: 18 }} /> : <ChevronRightIcon sx={{ fontSize: 18 }} />}
            </Box>
          ) : (
            <Box sx={{ width: 18 }} />
          )}
          <Tooltip title={row.state === "stale" ? "Implementing code changed — needs review" : row.state}>
            <Box sx={{ display: "flex" }}>{stateIcon(row.state)}</Box>
          </Tooltip>
          <Typography variant="caption" sx={{ color: TYPE_COLORS[c.type], fontWeight: 700, minWidth: 62 }}>
            {c.id}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: c.type === "epic" ? 700 : c.type === "feature" ? 600 : 400, flexGrow: 1 }} noWrap>
            {c.title}
          </Typography>
          {c.priority && (
            <Chip
              label={c.priority}
              size="small"
              sx={{ height: 18, fontSize: 10.5, fontWeight: 700, color: "#fff", bgcolor: PRIORITY_COLORS[c.priority] }}
            />
          )}
          {c.effort !== undefined && (
            <Chip label={`${c.effort} pts`} size="small" variant="outlined" sx={{ height: 18, fontSize: 10.5 }} />
          )}
          {c.iteration && (
            <Chip label={c.iteration} size="small" variant="outlined" sx={{ height: 18, fontSize: 10.5 }} />
          )}
          {row.links.length > 0 && (
            <Button
              size="small"
              startIcon={<LinkIcon sx={{ fontSize: 14 }} />}
              onClick={() => toggle(expandedLinks, setExpandedLinks, c.id)}
              sx={{ minWidth: 0, fontSize: 12, color: "text.secondary" }}
            >
              {row.links.length}
            </Button>
          )}
          {row.state === "stale" && row.links.length > 0 && (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              disabled={review.isPending}
              onClick={() => review.mutate(c.id)}
              sx={{ fontSize: 12, py: 0 }}
            >
              Review & accept
            </Button>
          )}
        </Box>

        <Collapse in={linksOpen} timeout={120}>
          {row.links.map((link, i) => {
            const stale = link.hash !== link.acceptedHash;
            return (
              <Box
                key={`${link.file}-${i}`}
                sx={{
                  ml: 6 + row.depth * 3,
                  mr: 2,
                  my: 1,
                  border: "1px solid",
                  borderColor: stale ? "rgba(242,203,29,0.4)" : "divider",
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", px: 1.25, py: 0.5, bgcolor: "rgba(255,255,255,0.03)" }}>
                  <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary", flexGrow: 1 }}>
                    {link.file}:{link.line}
                  </Typography>
                  {stale && (
                    <Chip label="code changed" size="small" sx={{ height: 16, fontSize: 10, bgcolor: STATE_COLORS.stale, color: "#1b1a19", fontWeight: 700 }} />
                  )}
                </Stack>
                <Box component="pre" sx={{ m: 0, px: 1.25, py: 1, fontSize: 12, fontFamily: "monospace", overflow: "auto", color: "text.secondary", maxHeight: 180 }}>
                  {link.snippet}
                </Box>
              </Box>
            );
          })}
        </Collapse>

        <Collapse in={open} timeout={120}>
          {row.children.map(renderRow)}
        </Collapse>
      </Box>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, flexGrow: 1 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
          Requirements
        </Typography>
        <Stack direction="row" spacing={1}>
          <Chip icon={stateIcon("checked", 14)} label={`${counts.checked} checked`} size="small" variant="outlined" />
          <Chip icon={stateIcon("stale", 14)} label={`${counts.stale} need review`} size="small" variant="outlined" />
          <Chip icon={stateIcon("unchecked", 14)} label={`${counts.unchecked} unlinked`} size="small" variant="outlined" />
        </Stack>
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            setRepoPath(trace?.repo?.path ?? "");
            setRepoName(trace?.repo?.name ?? "");
            connect.reset();
            setRepoDialog(true);
          }}
        >
          {trace?.repo ? `Repo: ${trace.repo.name}` : "Connect repo"}
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<SyncIcon sx={{ ...(scan.isPending && { animation: "spin 1s linear infinite" }), "@keyframes spin": { to: { transform: "rotate(360deg)" } } }} />}
          disabled={!trace?.repo || scan.isPending}
          onClick={() => scan.mutate()}
        >
          Scan
        </Button>
      </Stack>

      {trace?.scannedAt && (
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5 }}>
          Last scan {new Date(trace.scannedAt).toLocaleString()} · {trace.filesScanned} files
          {trace.warnings.length > 0 && ` · ${trace.warnings.length} warnings`}
        </Typography>
      )}
      {scan.isError && <Alert severity="error" sx={{ mx: 2, my: 1 }}>{(scan.error as Error).message}</Alert>}
      {trace && trace.warnings.length > 0 && (
        <Alert severity="warning" sx={{ mx: 2, my: 1 }}>
          {trace.warnings.slice(0, 3).join(" · ")}
          {trace.warnings.length > 3 && ` (+${trace.warnings.length - 3} more)`}
        </Alert>
      )}

      <Box sx={{ overflow: "auto", flexGrow: 1 }}>
        {cardsQuery.isLoading && (
          <Stack sx={{ alignItems: "center", py: 6 }}>
            <CircularProgress />
          </Stack>
        )}
        {!cardsQuery.isLoading && rows.length === 0 && (
          <Typography color="text.secondary" sx={{ p: 4, textAlign: "center" }}>
            No epics, features, or stories yet — create them in the Graph tab.
          </Typography>
        )}
        {rows.map(renderRow)}
        {!trace?.repo && rows.length > 0 && (
          <Alert severity="info" sx={{ m: 2 }}>
            Connect a repository and annotate code with <code>{"// @implements US-0001"}</code> —
            scanning links those blocks to requirements and flags them for review when the code
            changes.
          </Alert>
        )}
      </Box>

      <Dialog open={repoDialog} onClose={() => setRepoDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Connect repository</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Path (as seen by the API server)"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="/repos/my-project"
              fullWidth
              autoFocus
            />
            <TextField
              label="Display name (optional)"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              fullWidth
            />
            <Alert severity="info" sx={{ fontSize: 13 }}>
              Running in Docker? Mount the repo into the api service (e.g. in
              docker-compose.override.yml: <code>/home/you/code/my-project:/repos/my-project:ro</code>)
              and use the container path here.
            </Alert>
            {connect.isError && <Alert severity="error">{(connect.error as Error).message}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRepoDialog(false)}>Cancel</Button>
          <Button variant="contained" disabled={!repoPath.trim() || connect.isPending} onClick={() => connect.mutate()}>
            Connect
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
