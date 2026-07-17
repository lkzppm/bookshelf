import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, Collapse, InputBase, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { TYPE_COLORS, type Card, type CardType } from "../types";

const KNOWLEDGE: CardType[] = ["concept", "standard", "adr"];
const KNOWLEDGE_LABEL: Record<string, string> = {
  concept: "Concepts",
  standard: "Standards",
  adr: "Decisions (ADR)",
};

interface TreeNode {
  card: Card;
  children: TreeNode[];
}

function buildTree(cards: Card[]): TreeNode[] {
  const product = cards.filter((c) => !KNOWLEDGE.includes(c.type));
  const byId = new Map(product.map((c) => [c.id, { card: c, children: [] as TreeNode[] }]));
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.card.links.parent ? byId.get(node.card.links.parent) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.card.id.localeCompare(b.card.id));
    for (const n of nodes) sort(n.children);
  };
  sort(roots);
  return roots;
}

function matches(card: Card, text: string): boolean {
  return (
    card.id.toLowerCase().includes(text) ||
    card.title.toLowerCase().includes(text) ||
    card.tags.some((t) => t.toLowerCase().includes(text))
  );
}

/** True if the node or any descendant matches the filter. */
function subtreeMatches(node: TreeNode, text: string): boolean {
  return matches(node.card, text) || node.children.some((c) => subtreeMatches(c, text));
}

export interface ExplorerProps {
  cards: Card[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export default function Explorer({ cards, selectedId, onSelect }: ExplorerProps) {
  const [filter, setFilter] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const text = filter.trim().toLowerCase();

  const tree = useMemo(() => buildTree(cards), [cards]);
  const knowledge = useMemo(
    () =>
      KNOWLEDGE.map((type) => ({
        type,
        items: cards
          .filter((c) => c.type === type && (!text || matches(c, text)))
          .sort((a, b) => a.id.localeCompare(b.id)),
      })).filter((g) => g.items.length > 0),
    [cards, text],
  );

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // while filtering, everything relevant is force-expanded
  const isOpen = (key: string) => (text ? true : !collapsed.has(key));

  const row = (card: Card, depth: number, hasChildren: boolean, open: boolean) => (
    <Box
      key={card.id}
      onClick={() => onSelect(card.id)}
      sx={{
        display: "flex",
        alignItems: "center",
        pl: 1 + depth * 1.75,
        pr: 1,
        py: 0.4,
        cursor: "pointer",
        userSelect: "none",
        bgcolor: card.id === selectedId ? "rgba(0,120,212,0.18)" : "transparent",
        boxShadow: card.id === selectedId ? "inset 2px 0 0 #0078d4" : "none",
        "&:hover": { bgcolor: card.id === selectedId ? "rgba(0,120,212,0.22)" : "rgba(255,255,255,0.04)" },
      }}
    >
      {hasChildren ? (
        <Box
          onClick={(e) => {
            e.stopPropagation();
            toggle(card.id);
          }}
          sx={{ display: "flex", alignItems: "center", mr: 0.25, color: "text.secondary" }}
        >
          {open ? <ExpandMoreIcon sx={{ fontSize: 16 }} /> : <ChevronRightIcon sx={{ fontSize: 16 }} />}
        </Box>
      ) : (
        <Box sx={{ width: 18 }} />
      )}
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: 0.5,
          bgcolor: TYPE_COLORS[card.type],
          mr: 0.9,
          flexShrink: 0,
        }}
      />
      <Typography
        variant="body2"
        noWrap
        sx={{ fontSize: 13, color: "text.primary", "& span": { color: "text.secondary" } }}
      >
        <span>{card.id}</span> {card.title}
      </Typography>
    </Box>
  );

  const renderTree = (nodes: TreeNode[], depth: number) =>
    nodes
      .filter((n) => !text || subtreeMatches(n, text))
      .map((n) => {
        const open = isOpen(n.card.id);
        return (
          <Box key={n.card.id}>
            {row(n.card, depth, n.children.length > 0, open)}
            {n.children.length > 0 && (
              <Collapse in={open} timeout={120}>
                {renderTree(n.children, depth + 1)}
              </Collapse>
            )}
          </Box>
        );
      });

  const section = (key: string, label: string, count: number, content: React.ReactNode) => {
    const open = isOpen(`§${key}`);
    return (
      <Box key={key}>
        <Box
          onClick={() => toggle(`§${key}`)}
          sx={{
            display: "flex",
            alignItems: "center",
            px: 0.75,
            py: 0.5,
            cursor: "pointer",
            userSelect: "none",
            position: "sticky",
            top: 0,
            zIndex: 1,
            bgcolor: "background.default",
            "&:hover": { bgcolor: "rgba(255,255,255,0.04)" },
          }}
        >
          {open ? (
            <ExpandMoreIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          ) : (
            <ChevronRightIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          )}
          <Typography
            sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: "text.secondary", ml: 0.25 }}
          >
            {label.toUpperCase()}
          </Typography>
          <Typography sx={{ fontSize: 11, color: "text.secondary", ml: 0.75 }}>{count}</Typography>
        </Box>
        <Collapse in={open} timeout={120}>
          {content}
        </Collapse>
      </Box>
    );
  };

  const productCount = cards.filter((c) => !KNOWLEDGE.includes(c.type)).length;
  const knowledgeCount = cards.filter((c) => KNOWLEDGE.includes(c.type)).length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "background.default" }}>
      <Box sx={{ px: 1, py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
        <InputBase
          placeholder="Filter cards…"
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
      </Box>
      <Box sx={{ overflow: "auto", flexGrow: 1, py: 0.5 }}>
        {section("product", "Product", productCount, renderTree(tree, 0))}
        {section(
          "knowledge",
          "Knowledge",
          knowledgeCount,
          knowledge.map((group) => (
            <Box key={group.type}>
              <Typography
                sx={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, color: "text.secondary", pl: 2.4, pt: 0.75, pb: 0.25 }}
              >
                {KNOWLEDGE_LABEL[group.type]?.toUpperCase()}
              </Typography>
              {group.items.map((c) => row(c, 1, false, false))}
            </Box>
          )),
        )}
        {text && productCount + knowledgeCount > 0 && knowledge.length === 0 && tree.every((n) => !subtreeMatches(n, text)) && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            Nothing matches "{filter}".
          </Typography>
        )}
      </Box>
    </Box>
  );
}
