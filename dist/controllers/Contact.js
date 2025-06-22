"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const contact_1 = __importDefault(require("../services/contact"));
async function identifyOrCreateContact(req, res) {
    const { email, phoneNumber } = req.body;
    try {
        const contactRes = await contact_1.default.identifyOrCreateContact(email, phoneNumber);
        if (!contactRes.success) {
            const error = contactRes.error;
            res.status(error.code).json({ message: error.message });
            return;
        }
        res.status(200).json({ contact: contactRes.data.contact });
    }
    catch (error) {
        console.error("Error in controller identifyContact", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
exports.default = {
    identifyOrCreateContact,
};
