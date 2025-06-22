"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const contact_1 = __importDefault(require("./controllers/contact"));
const errorHandler_1 = __importDefault(require("./middlewares/errorHandler"));
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.post("/identify", contact_1.default.identifyOrCreateContact);
app.use(errorHandler_1.default);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
