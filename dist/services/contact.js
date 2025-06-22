"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const contact_1 = __importDefault(require("../repositories/contact"));
const prisma_1 = require("../../generated/prisma");
async function identifyOrCreateContact(email, phoneNumber) {
    if (!email && !phoneNumber)
        return { success: false, error: { code: 400, message: "Email or Phone number required" } };
    const existingContacts = await contact_1.default.findByEmailOrPhoneNumber(email, phoneNumber);
    if (existingContacts.length === 0) {
        const primaryContact = await contact_1.default.create(email, phoneNumber);
        return {
            success: true,
            data: {
                contact: {
                    primaryContactId: primaryContact.id,
                    emails: [],
                    phoneNumbers: [],
                    secondaryContactIds: [],
                },
                isCreatedNew: true,
            }
        };
    }
    const emails = new Set();
    const phoneNumbers = new Set();
    const secondaryContactIds = [];
    let isCreatedNew = false;
    const primaryContact = existingContacts.find((c) => c.linkPrecedence === prisma_1.LinkPrecedence.primary) || existingContacts[0];
    emails.add(primaryContact.email);
    phoneNumbers.add(primaryContact.phoneNumber);
    for (const contact of existingContacts) {
        if (contact.id !== primaryContact.id) {
            emails.add(contact.email);
            phoneNumbers.add(contact.phoneNumber);
            secondaryContactIds.push(contact.id);
            if (!contact.linkedId || contact.linkedId !== primaryContact.id) {
                await contact_1.default.updateLinkAndPrecedence(contact.id, primaryContact.id, prisma_1.LinkPrecedence.secondary);
            }
        }
    }
    if ((email && !emails.has(email)) ||
        (phoneNumber && !phoneNumbers.has(phoneNumber))) {
        isCreatedNew = true;
        const newSecondaryContact = await contact_1.default.create(email, phoneNumber);
        secondaryContactIds.push(newSecondaryContact.id);
        if (email)
            emails.add(email);
        if (phoneNumber)
            phoneNumbers.add(phoneNumber);
    }
    return {
        success: true,
        data: {
            contact: {
                primaryContactId: primaryContact.id,
                emails: Array.from(emails),
                phoneNumbers: Array.from(phoneNumbers),
                secondaryContactIds,
            },
            isCreatedNew,
        }
    };
}
exports.default = {
    identifyOrCreateContact,
};
