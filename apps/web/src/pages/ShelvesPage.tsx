import AddIcon from "@mui/icons-material/Add";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function ShelvesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const shelves = useQuery({ queryKey: ["shelves"], queryFn: api.listShelves });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [seed, setSeed] = useState(true);

  const create = useMutation({
    mutationFn: () => api.createShelf(name, description, seed),
    onSuccess: (shelf) => {
      queryClient.invalidateQueries({ queryKey: ["shelves"] });
      setOpen(false);
      navigate(`/shelf/${shelf.slug}`);
    },
  });

  const remove = useMutation({
    mutationFn: (slug: string) => api.deleteShelf(slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shelves"] }),
  });

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: "background.paper" }}>
        <Toolbar>
          <AutoStoriesIcon sx={{ mr: 1.5, color: "primary.main" }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Bookshelf
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setName("");
              setDescription("");
              setSeed(true);
              create.reset();
              setOpen(true);
            }}
          >
            New shelf
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 5 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          A shelf is one project's connected spec corpus — epics, features, stories, and the
          knowledge layer your team and its coding agents share.
        </Typography>

        {shelves.isError && <Alert severity="error">{(shelves.error as Error).message}</Alert>}

        <Stack spacing={2}>
          {shelves.data?.map((shelf) => (
            <Card key={shelf.slug} variant="outlined">
              <CardActionArea onClick={() => navigate(`/shelf/${shelf.slug}`)}>
                <CardContent>
                  <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6">{shelf.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {shelf.description || "No description"}
                      </Typography>
                    </Box>
                    <Chip label={`${shelf.cardCount} cards`} size="small" />
                    {shelf.parseErrors.length > 0 && (
                      <Chip label={`${shelf.parseErrors.length} parse errors`} color="warning" size="small" />
                    )}
                    <IconButton
                      aria-label="delete shelf"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (window.confirm(`Delete shelf "${shelf.name}" and all its cards?`)) {
                          remove.mutate(shelf.slug);
                        }
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
          {shelves.data?.length === 0 && (
            <Typography color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
              No shelves yet — create the first one.
            </Typography>
          )}
        </Stack>
      </Container>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New shelf</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              fullWidth
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <FormControlLabel
              control={<Checkbox checked={seed} onChange={(e) => setSeed(e.target.checked)} />}
              label="Seed with sample cards (recommended for a first look)"
            />
            {create.isError && <Alert severity="error">{(create.error as Error).message}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
