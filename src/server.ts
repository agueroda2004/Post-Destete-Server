import "dotenv/config";

import { buildApp } from "./app";
import { buildContainer } from "./container";

const PORT = Number(process.env.PORT ?? 3001);

const container = buildContainer();
const app = buildApp(container);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
