import { Request, Response } from "express";
import { IPreviewData } from "../../model/eventData";
import { WebsocketIncoming } from "../../connector/websocketIncoming";
import { KeyValidity } from "../../connector/databaseConnector";
import { PreviewMatch } from "./PreviewModel";

export class PreviewHandler {
  private static instance: PreviewHandler;
  private wsi: WebsocketIncoming;

  private previews: Map<string, PreviewMatch> = new Map();
  private previewTimeouts: Map<string, NodeJS.Timeout> = new Map();

  private constructor(wsi: WebsocketIncoming) {
    this.wsi = wsi;
  }

  public static getInstance(wsi?: WebsocketIncoming): PreviewHandler {
    if (PreviewHandler.instance == null) PreviewHandler.instance = new PreviewHandler(wsi!);
    return PreviewHandler.instance;
  }

  public async handlePreviewCreation(req: Request, res: Response) {
    try {
      const previewData: IPreviewData = req.body;
      if (!previewData.key || previewData.key == null) {
        return res.status(400).json({ error: "Missing or invalid key in preview data" });
      }

      const validity: KeyValidity = await this.wsi.isValidKey(previewData.key);
      if (!validity.valid) {
        return res.status(403).json({ error: "Invalid or expired key" });
      }
      previewData.organizationId = validity.organizationId;

      let previewCode: string = previewData.previewCode;
      if (!previewCode || previewCode.length !== 6) {
        for (let i = 0; i < 6; i++) {
          previewCode += validGroupcodeCharacters.charAt(
            Math.floor(Math.random() * validGroupcodeCharacters.length),
          );
        }
      }

      const previewMatch = new PreviewMatch(previewData);
      this.previews.set(previewCode, previewMatch);
      res.status(200).json({ previewCode: previewCode });

      // Set a timeout to remove the preview after 10 minutes
      if (this.previewTimeouts.has(previewCode)) {
        clearTimeout(this.previewTimeouts.get(previewCode)!);
        this.previewTimeouts.delete(previewCode);
      }
      const timeout = setTimeout(
        () => {
          this.previews.delete(previewCode);
          this.previewTimeouts.delete(previewCode);
        },
        10 * 60 * 1000,
      );
      this.previewTimeouts.set(previewCode, timeout);

      return res;
    } catch (e: any) {
      return res.status(400).json({ error: "Invalid preview data", details: e.message });
    }
  }

  public getPreview(previewCode: string): PreviewMatch | undefined {
    return this.previews.get(previewCode);
  }
}

// Uppercase letters and digits, excluding I and O to avoid confusion with other characters
const validGroupcodeCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
