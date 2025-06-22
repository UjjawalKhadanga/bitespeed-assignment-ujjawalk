import contactRepository from "../repositories/contact";
import { LinkPrecedence } from "../../generated/prisma";
import { IdentifyContactResponse, ServiceResponse } from "../types";

async function identifyOrCreateContact(email: string, phoneNumber: string) : Promise<ServiceResponse<IdentifyContactResponse>> {
    if (!email && !phoneNumber) return { success: false, error: { code: 400, message: "Email or Phone number required" } };
    const existingContacts = await contactRepository.findByEmailOrPhoneNumber(email, phoneNumber);

    if (existingContacts.length === 0) {
      const primaryContact = await contactRepository.create(email, phoneNumber);
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
      }
    }

    const emails: Set<string> = new Set();
    const phoneNumbers: Set<string> = new Set();
    const secondaryContactIds: number[] = [];
    let isCreatedNew = false;
    

    const primaryContact = existingContacts.find((c) => c.linkPrecedence === LinkPrecedence.primary) || existingContacts[0];

    emails.add(primaryContact.email!);
    phoneNumbers.add(primaryContact.phoneNumber!);

    for (const contact of existingContacts) {
      if (contact.id !== primaryContact.id) {
        emails.add(contact.email!);
        phoneNumbers.add(contact.phoneNumber!);
        secondaryContactIds.push(contact.id);
    
        if (!contact.linkedId || contact.linkedId !== primaryContact.id) {
          await contactRepository.updateLinkAndPrecedence(contact.id, primaryContact.id, LinkPrecedence.secondary);
        }
      }
    }

    if (
      (email && !emails.has(email)) ||
      (phoneNumber && !phoneNumbers.has(phoneNumber))
    ) {
      isCreatedNew = true;
      const newSecondaryContact = await contactRepository.create(email, phoneNumber);

      secondaryContactIds.push(newSecondaryContact.id);
      if (email) emails.add(email);
      if (phoneNumber) phoneNumbers.add(phoneNumber);
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

export default {
  identifyOrCreateContact,
};