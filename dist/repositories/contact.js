"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../config/prisma"));
async function findByEmailOrPhoneNumber(email, phoneNumber) {
    return await prisma_1.default.contact.findMany({
        where: { OR: [{ email }, { phoneNumber }] },
    });
}
async function create(email, phoneNumber) {
    return await prisma_1.default.contact.create({
        data: { email, phoneNumber },
    });
}
async function updateLinkAndPrecedence(id, linkedId, linkPrecedence) {
    return await prisma_1.default.contact.update({
        where: { id },
        data: { linkedId, linkPrecedence },
    });
}
exports.default = {
    findByEmailOrPhoneNumber,
    create,
    updateLinkAndPrecedence,
};
