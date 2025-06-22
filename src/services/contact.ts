import { LinkPrecedence, Contact, Prisma, PrismaClient } from "../../generated/prisma";
import { IdentifyContactResponse, ServiceResponse } from "../types";
import prisma from "../config/prisma";

async function identifyOrCreateContact(email: string, phoneNumber: string): Promise<ServiceResponse<IdentifyContactResponse>> {
  if (!email && !phoneNumber) {
    return { success: false, error: { code: 400, message: "Email or Phone number required" } };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const whereCondition: Prisma.ContactWhereInput = { OR: [] };
      if (email) whereCondition.OR!.push({ email });
      if (phoneNumber) whereCondition.OR!.push({ phoneNumber });

      const initialContacts = await tx.contact.findMany({ where: whereCondition });
      
      if (initialContacts.length === 0) {
        // Case 1: If no contacts are found, create a new primary
        const newContact = await tx.contact.create({
          data: {
            email: email || null,
            phoneNumber: phoneNumber || null,
            linkPrecedence: LinkPrecedence.primary
          }
        });

        return {
          success: true as const,
          data: {
            contact: {
              primaryContactId: newContact.id,
              emails: newContact.email ? [newContact.email] : [],
              phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
              secondaryContactIds: []
            },
            isCreatedNew: true,
          }
        };
      }

      // Case 2: Multiple contacts are matched
      const chainResult = await expandContactChain(initialContacts, tx);
      if (!chainResult) throw new Error("Failed to expand contact chain");
      
      const { allContacts, primaryContacts } = chainResult;
      
      // Get main primary contact
      const mainPrimary = primaryContacts.length > 1 
        ? await mergeChains(primaryContacts, allContacts, tx)
        : (primaryContacts[0] || null);
      
      if (!mainPrimary) throw new Error("No primary contact found");

      const { emails, phoneNumbers, secondaryContactIds } = collectContactData(mainPrimary, allContacts);
      
      const newContact = await createSecondaryIfNeeded(
        email, 
        phoneNumber, 
        emails, 
        phoneNumbers, 
        mainPrimary.id, 
        tx
      );
      
      if (newContact) updateCollections(newContact, emails, phoneNumbers, secondaryContactIds);

      return {
        success: true as const,
        data: {
          contact: {
            primaryContactId: mainPrimary.id,
            emails: Array.from(emails).filter(e => e) as string[], // Remove empty values
            phoneNumbers: Array.from(phoneNumbers).filter(p => p) as string[], // Remove empty values
            secondaryContactIds
          },
          isCreatedNew: !!newContact
        }
      };
    });
  } catch (error) {
    console.error("Transaction failed:", error);
    return {
      success: false,
      error: { code: 500, message: "Internal server error" }
    };
  }
}

async function expandContactChain(initialContacts: Contact[], tx: Prisma.TransactionClient) {
  const contactIds = new Set<number>();
  const queue: Contact[] = [];
  
  initialContacts.forEach(contact => {
    queue.push(contact);
    contactIds.add(contact.id);
  });

  let index = 0;
  while (index < queue.length) {
    const contact = queue[index++];
    if (!contact) continue;

    if (contact.linkPrecedence === LinkPrecedence.secondary && contact.linkedId) {
      if (!contactIds.has(contact.linkedId)) {
        const linkedContact = await tx.contact.findUnique({
          where: { id: contact.linkedId }
        });
        if (linkedContact) {
          queue.push(linkedContact);
          contactIds.add(linkedContact.id);
        }
      }
    }
  }

  const primaryContacts = queue.filter(c => c?.linkPrecedence === LinkPrecedence.primary);

  for (const primary of primaryContacts) {
    if (!primary) continue;
    
    const secondaries = await tx.contact.findMany({
      where: { linkedId: primary.id }
    });
    
    for (const sec of secondaries) {
      if (sec && !contactIds.has(sec.id)) {
        queue.push(sec);
        contactIds.add(sec.id);
      }
    }
  }

  const validQueue = queue.filter(c => c !== undefined && c !== null);
  
  return {
    allContacts: validQueue,
    primaryContacts: primaryContacts.filter(p => p !== undefined && p !== null)
  };
}

function collectContactData(primary: Contact, contacts: Contact[]) {
  const emails = new Set<string>();
  const phoneNumbers = new Set<string>();
  const secondaryContactIds: number[] = [];


  if (primary?.email) emails.add(primary.email);
  if (primary?.phoneNumber) phoneNumbers.add(primary.phoneNumber);

  for (const contact of contacts) {
    if (!contact || contact.id === primary.id) continue;

    if (contact.email) emails.add(contact.email);
    if (contact.phoneNumber) phoneNumbers.add(contact.phoneNumber);
    
    if (contact.linkPrecedence === LinkPrecedence.secondary) {
      secondaryContactIds.push(contact.id);
    }
  }

  return { emails, phoneNumbers, secondaryContactIds };
}

async function createSecondaryIfNeeded(
  email: string | null,
  phone: string | null,
  existingEmails: Set<string>,
  existingPhones: Set<string>,
  primaryId: number,
  tx: Prisma.TransactionClient
) {
  const hasNewEmail = email && !existingEmails.has(email);
  const hasNewPhone = phone && !existingPhones.has(phone);

  if (!hasNewEmail && !hasNewPhone) return null;

  return tx.contact.create({
    data: {
      email: hasNewEmail ? email : null,
      phoneNumber: hasNewPhone ? phone : null,
      linkedId: primaryId,
      linkPrecedence: LinkPrecedence.secondary
    }
  });
}

function updateCollections(
  contact: Contact,
  emails: Set<string>,
  phones: Set<string>,
  secondaryIds: number[]
) {
  if (contact?.email) emails.add(contact.email);
  if (contact?.phoneNumber) phones.add(contact.phoneNumber);
  if (contact?.id) secondaryIds.push(contact.id);
}

async function mergeChains(primaryContacts: Contact[], allContacts: Contact[], tx: Prisma.TransactionClient) {
  const sortedPrimaries = [...primaryContacts].sort((a, b) => 
    a.createdAt.getTime() - b.createdAt.getTime()
  );
  const [mainPrimary, ...otherPrimaries] = sortedPrimaries;

  for (const primary of otherPrimaries) {
    await tx.contact.update({
      where: { id: primary.id },
      data: {
        linkedId: mainPrimary.id,
        linkPrecedence: LinkPrecedence.secondary,
        updatedAt: new Date()
      }
    });

    const secondaries = allContacts.filter(c => c.linkedId === primary.id);
    for (const sec of secondaries) {
      await tx.contact.update({
        where: { id: sec.id },
        data: { linkedId: mainPrimary.id, updatedAt: new Date() }
      });
    }
  }

  return mainPrimary;
}

export default {
  identifyOrCreateContact,
};