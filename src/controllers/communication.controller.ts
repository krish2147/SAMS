import { Request, Response } from "express";
import {
  getCommunicationLogs,
  getCommunicationTemplates,
  updateCommunicationTemplate,
  sendBulkAnnouncement,
  retryCommunicationLog,
  getCommunicationStats,
  sendEventNotification
} from "../services/communication.service";

export async function handleGetLogs(req: Request, res: Response): Promise<void> {
  try {
    const { search, channel, status, eventKey, recipientGroup } = req.query;
    const logs = await getCommunicationLogs({
      search: search ? String(search) : undefined,
      channel: channel ? String(channel) : undefined,
      status: status ? String(status) : undefined,
      eventKey: eventKey ? String(eventKey) : undefined,
      recipientGroup: recipientGroup ? String(recipientGroup) : undefined
    });
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch communication logs." });
  }
}

export async function handleGetTemplates(req: Request, res: Response): Promise<void> {
  try {
    const templates = await getCommunicationTemplates();
    res.json({ success: true, templates });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch message templates." });
  }
}

export async function handleUpdateTemplate(req: Request, res: Response): Promise<void> {
  try {
    const { eventKey } = req.params;
    const body = req.body;
    if (!eventKey) {
      res.status(400).json({ success: false, error: "eventKey parameter is required." });
      return;
    }
    await updateCommunicationTemplate(eventKey, body);
    res.json({ success: true, message: `Template '${eventKey}' updated successfully.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to update template." });
  }
}

export async function handleSendBulk(req: Request, res: Response): Promise<void> {
  try {
    const { targetGroup, subject, messageText } = req.body;
    if (!targetGroup || !messageText) {
      res.status(400).json({ success: false, error: "targetGroup and messageText are required." });
      return;
    }
    const sentByAdmin = (req as any).user?.name || "System Admin";
    const result = await sendBulkAnnouncement(targetGroup, subject || "Baroda Swim Front Announcement", messageText, sentByAdmin);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Bulk announcement failed." });
  }
}

export async function handleRetryLog(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: "Log ID is required." });
      return;
    }
    const result = await retryCommunicationLog(Number(id));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Retry dispatch failed." });
  }
}

export async function handleGetStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await getCommunicationStats();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to calculate communication statistics." });
  }
}

export async function handleTestTrigger(req: Request, res: Response): Promise<void> {
  try {
    const { eventKey, memberName, mobileNo, email, customVars } = req.body;
    if (!eventKey || !memberName) {
      res.status(400).json({ success: false, error: "eventKey and memberName are required for test trigger." });
      return;
    }
    const log = await sendEventNotification(
      eventKey,
      { memberName, mobileNo: mobileNo || "9876543210", email: email || "test@barodaswimfront.in" },
      customVars || {},
      "Test Manual Trigger"
    );
    res.json({ success: true, log });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Test trigger failed." });
  }
}
