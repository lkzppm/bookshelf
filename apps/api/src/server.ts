import path from "node:path";
import { buildApp } from "./app.js";
import { ShelfStore } from "./store.js";

const dataDir = process.env.DATA_DIR ?? path.resolve("data");
const port = Number(process.env.PORT ?? 9300);

const store = new ShelfStore(dataDir);
store.startWatching();

const app = buildApp(store);

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => console.log(`bookshelf api on :${port} (data: ${dataDir})`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await store.close();
    await app.close();
    process.exit(0);
  });
}
