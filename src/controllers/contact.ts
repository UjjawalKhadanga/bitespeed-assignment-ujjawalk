import { Request, Response } from "express";
import contactService from "../services/contact";

async function identifyOrCreateContact(req: Request, res: Response) {
  const { email, phoneNumber } = req.body;
  try {
    const contactRes = await contactService.identifyOrCreateContact(email, phoneNumber);
    if (!contactRes.success) {
      const error = contactRes.error;
      res.status(error.code).json({ message: error.message });
      return;
    }
    res.status(200).json({ contact: contactRes.data.contact });
  } catch (error) {
    console.error("Error in controller identifyContact", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export default {
  identifyOrCreateContact,
};