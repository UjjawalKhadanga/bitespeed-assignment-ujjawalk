import { LinkPrecedence, Contact } from "../../generated/prisma";
import prisma from "../config/prisma";


async function findByEmailOrPhoneNumber(email: string, phoneNumber: string): Promise<Contact[]> {
  return await prisma.contact.findMany({
    where: { OR: [{ email }, { phoneNumber }] },
  });
}

async function create(email: string, phoneNumber: string): Promise<Contact> {
  return await prisma.contact.create({
    data: { email, phoneNumber },
  });
}

async function updateLinkAndPrecedence(id: number, linkedId: number, linkPrecedence: LinkPrecedence): Promise<Contact> {
  return await prisma.contact.update({
    where: { id },
    data: { linkedId, linkPrecedence },
  });
}

export default {
  findByEmailOrPhoneNumber,
  create,
  updateLinkAndPrecedence,
};
