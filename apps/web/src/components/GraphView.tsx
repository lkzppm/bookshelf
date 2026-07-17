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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { EDGE_STYLES, STATUS_COLORS, TYPE_COLORS, type ShelfGraph } from "../types";

const NODE_W = 230;
const NODE_H = 72;

type CardNodeData = {
  id: string;
  title: string;
  cardType: keyof typeof TYPE_COLORS;
  status: keyof typeof STATUS_COLORS;
  selected: boolean;
};

function CardNode({ data }: NodeProps<Node<CardNodeData>>) {
  const color = TYPE_COLORS[data.cardType];
  return (
    <Box
      sx={{
        width: NODE_W,
        height: NODE_H,
        borderRadius: 2,
        border: "2px solid",
        borderColor: data.selected ? "#fff" : color,
        bgcolor: "background.paper",
        px: 1.5,
        py: 1,
        boxShadow: data.selected ? `0 0 12px ${color}` : 2,
        overflow: "hidden",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography variant="caption" sx={{ color, fontWeight: 700 }}>
          {data.id}
        </Typography>
        <Chip
          label={data.status}
          size="small"
          sx={{
            height: 16,
            fontSize: 10,
            bgcolor: STATUS_COLORS[data.status],
            color: "#0f1117",
            fontWeight: 700,
          }}
        />
      </Stack>
      <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.25, mt: 0.5 }} noWrap>
        {data.title}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {data.cardType}
      </Typography>
    </Box>
  );
}

const nodeTypes = { card: CardNode };

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

export interface GraphViewProps {
  graph: ShelfGraph;
  selectedId?: string;
  visibleEdgeTypes: Set<string>;
  onSelect: (id: string) => void;
}

export default function GraphView({ graph, selectedId, visibleEdgeTypes, onSelect }: GraphViewProps) {
  const { nodes, edges } = useMemo(() => {
    const positions = layout(graph);
    const nodes: Node<CardNodeData>[] = graph.nodes.map((n) => ({
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
    const edges: Edge[] = graph.edges
      .filter((e) => visibleEdgeTypes.has(e.type))
      .map((e) => {
        const style = EDGE_STYLES[e.type];
        return {
          id: `${e.from}-${e.type}-${e.to}`,
          source: e.from,
          target: e.to,
          label: e.type === "parent" ? undefined : style.label,
          labelStyle: { fill: "#94a3b8", fontSize: 10 },
          labelBgStyle: { fill: "#0f1117", fillOpacity: 0.8 },
          animated: e.type === "depends-on",
          style: {
            stroke: style.stroke,
            strokeWidth: 1.5,
            ...(style.dash ? { strokeDasharray: style.dash } : {}),
          },
        };
      });
    return { nodes, edges };
  }, [graph, selectedId, visibleEdgeTypes]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_ev, node) => onSelect(node.id)}
      fitView
      minZoom={0.2}
      proOptions={{ hideAttribution: true }}
      nodesDraggable
      nodesConnectable={false}
      colorMode="dark"
    >
      <Background gap={24} />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) => TYPE_COLORS[(n.data as CardNodeData).cardType] ?? "#64748b"}
        style={{ background: "#171923" }}
      />
    </ReactFlow>
  );
}
