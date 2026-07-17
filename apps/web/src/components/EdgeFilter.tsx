import FilterListIcon from "@mui/icons-material/FilterList";
import { Badge, Box, Button, Checkbox, Popover, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { EDGE_STYLES } from "../types";

const ALL = Object.keys(EDGE_STYLES);

/** Small line sample showing the edge's color + dash pattern. */
function LineSample({ type }: { type: keyof typeof EDGE_STYLES }) {
  const style = EDGE_STYLES[type];
  return (
    <svg width="28" height="10" aria-hidden>
      <line
        x1="1"
        y1="5"
        x2="27"
        y2="5"
        stroke={style.stroke}
        strokeWidth="2"
        strokeDasharray={style.dash}
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface EdgeFilterProps {
  visible: Set<string>;
  onChange: (next: Set<string>) => void;
}

export default function EdgeFilter({ visible, onChange }: EdgeFilterProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const hiddenCount = ALL.length - visible.size;

  const toggle = (type: string) => {
    const next = new Set(visible);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    onChange(next);
  };

  return (
    <>
      <Badge badgeContent={hiddenCount > 0 ? hiddenCount : undefined} color="primary">
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          startIcon={<FilterListIcon />}
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ borderColor: "divider", color: "text.secondary" }}
        >
          Relations
        </Button>
      </Badge>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 240, p: 1 } } }}
      >
        <Stack direction="row" sx={{ alignItems: "center", px: 1, pb: 0.5 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: "text.secondary", flexGrow: 1 }}>
            SHOW RELATIONS
          </Typography>
          <Button size="small" sx={{ minWidth: 0, fontSize: 11 }} onClick={() => onChange(new Set(ALL))}>
            All
          </Button>
          <Button size="small" sx={{ minWidth: 0, fontSize: 11 }} onClick={() => onChange(new Set(["parent"]))}>
            Tree
          </Button>
        </Stack>
        {ALL.map((type) => (
          <Box
            key={type}
            onClick={() => toggle(type)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1,
              py: 0.25,
              borderRadius: 1,
              cursor: "pointer",
              "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
            }}
          >
            <Checkbox size="small" checked={visible.has(type)} sx={{ p: 0.5 }} disableRipple />
            <LineSample type={type as keyof typeof EDGE_STYLES} />
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              {EDGE_STYLES[type as keyof typeof EDGE_STYLES].label}
            </Typography>
          </Box>
        ))}
      </Popover>
    </>
  );
}
