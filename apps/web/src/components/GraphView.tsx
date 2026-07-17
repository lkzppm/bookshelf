import dagre from "@dagrejs/dagre";
import { Box, Chip, Stack, Typography } from "@mui/material";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  type Edge,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  EDGE_STYLES,
  STATUS_COLORS,
  TYPE_COLORS,
  statusTextColor,
  type CardStatus,
  type ShelfGraph,
} from "../types";

const NODE_W = 230;
const NODE_H = 68;

type CardNodeData = {
  id: string;
  title: string;
  cardType: keyof typeof TYPE_COLORS;
  status: CardStatus;
  selected: boolean;
};
type CardNode = Node<CardNodeData>;

/** Azure-DevOps-style work item card: colored left accent strip per type. */
function CardNodeView({ data }: NodeProps<CardNode>) {
  const color = TYPE_COLORS[data.cardType];
  return (
    <Box
      sx={{
        width: NODE_W,
        height: NODE_H,
        borderRadius: 1,
        borderLeft: `4px solid ${color}`,
        border: "1px solid",
        borderColor: data.selected ? "primary.main" : "rgba(255,255,255,0.10)",
        borderLeftWidth: 4,
        borderLeftColor: color,
        bgcolor: "background.paper",
        px: 1.5,
        py: 1,
        boxShadow: data.selected ? "0 0 0 1px #0078d4, 0 4px 14px rgba(0,120,212,0.35)" : 1,
        overflow: "hidden",
        cursor: "grab",
        "&:active": { cursor: "grabbing" },
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography variant="caption" sx={{ color, fontWeight: 700, letterSpacing: 0.3 }}>
          {data.id}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {data.cardType}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Chip
          label={data.status}
          size="small"
          sx={{
            height: 16,
            fontSize: 10,
            bgcolor: STATUS_COLORS[data.status],
            color: statusTextColor(data.status),
            fontWeight: 700,
          }}
        />
      </Stack>
      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3, mt: 0.6 }} noWrap>
        {data.title}
      </Typography>
    </Box>
  );
}

const nodeTypes = { card: CardNodeView };

function layout(graph: ShelfGraph): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", ranksep: 70, nodesep: 40 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of graph.nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  // layout backbone: hierarchy + dependencies (a DAG); other edges render as overlays
  for (const e of graph.edges) {
    if (e.type === "parent") g.setEdge(e.from, e.to);
    if (e.type === "depends-on") g.setEdge(e.to, e.from);
  }
  dagre.layout(g);
  const pos = new Map<string, { x: number; y: number }>();
  for (const n of graph.nodes) {
    const p = g.node(n.id);
    pos.set(n.id, { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 });
  }
  return pos;
}

function buildNodes(graph: ShelfGraph, selectedId: string | undefined): CardNode[] {
  const positions = layout(graph);
  return graph.nodes.map((n) => ({
    id: n.id,
    type: "card",
    position: positions.get(n.id) ?? { x: 0, y: 0 },
    data: {
      id: n.id,
      title: n.title,
      cardType: n.type,
      status: n.status,
      selected: n.id === selectedId,
    },
  }));
}

/** Structure signature — re-layout only when nodes or backbone edges change. */
function structureSig(graph: ShelfGraph): string {
  const ids = graph.nodes.map((n) => n.id).sort();
  const backbone = graph.edges
    .filter((e) => e.type === "parent" || e.type === "depends-on")
    .map((e) => `${e.from}>${e.to}`)
    .sort();
  return JSON.stringify([ids, backbone]);
}

export interface GraphViewProps {
  graph: ShelfGraph;
  selectedId?: string;
  visibleEdgeTypes: Set<string>;
  onSelect: (id: string) => void;
}

export default function GraphView({ graph, selectedId, visibleEdgeTypes, onSelect }: GraphViewProps) {
  const [initialNodes] = useState<CardNode[]>(() => buildNodes(graph, selectedId));
  const [nodes, setNodes, onNodesChange] = useNodesState<CardNode>(initialNodes);
  const sigRef = useRef(structureSig(graph));

  // structure changed → fresh dagre layout; content-only change → update data, keep dragged positions
  useEffect(() => {
    const sig = structureSig(graph);
    if (sig !== sigRef.current) {
      sigRef.current = sig;
      setNodes(buildNodes(graph, selectedId));
      return;
    }
    const info = new Map(graph.nodes.map((n) => [n.id, n]));
    setNodes((nds) =>
      nds.map((nd) => {
        const n = info.get(nd.id);
        return n
          ? {
              ...nd,
              data: {
                id: n.id,
                title: n.title,
                cardType: n.type,
                status: n.status,
                selected: n.id === selectedId,
              },
            }
          : nd;
      }),
    );
    // selectedId handled here too so selection never resets positions
  }, [graph, selectedId, setNodes]);

  const edges: Edge[] = useMemo(
    () =>
      graph.edges
        .filter((e) => visibleEdgeTypes.has(e.type))
        .map((e) => {
          const style = EDGE_STYLES[e.type];
          return {
            id: `${e.from}-${e.type}-${e.to}`,
            source: e.from,
            target: e.to,
            animated: e.type === "depends-on",
            style: {
              stroke: style.stroke,
              strokeWidth: 1.5,
              ...(style.dash ? { strokeDasharray: style.dash } : {}),
            },
          };
        }),
    [graph, visibleEdgeTypes],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onNodeClick={(_ev, node) => onSelect(node.id)}
      fitView
      minZoom={0.2}
      proOptions={{ hideAttribution: true }}
      nodesDraggable
      nodesConnectable={false}
      colorMode="dark"
    >
      <Background gap={24} color="rgba(255,255,255,0.06)" />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) => TYPE_COLORS[(n.data as CardNodeData).cardType] ?? "#8a8886"}
        style={{ background: "#1d2027" }}
      />
    </ReactFlow>
  );
}
