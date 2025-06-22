import express from "express";
import bodyParser from "body-parser";
import ContactController from "./controllers/contact";
import errorHandler from "./middlewares/errorHandler";

const app = express();

app.use(bodyParser.json());

app.post("/identify", ContactController.identifyOrCreateContact);

app.use(errorHandler)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
