import PostalMime from "postal-mime";

interface Env {
  ATTACHMENT_ENDPOINT: string;
  NO_ATTACHMENT_FORWARD_TO: string;
  CF_CLIENT_ID: string;
  CF_CLIENT_SECRET: string;
}

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
    const rawEmail = new Response(message.raw);
    const buf = await rawEmail.arrayBuffer();

    const parser = new PostalMime();
    const parsed = await parser.parse(buf);

    const attachments = parsed.attachments;
    if (!attachments || attachments.length === 0) {
      console.log(`No attachments found, forwarding to ${env.NO_ATTACHMENT_FORWARD_TO}`);
      await message.forward(env.NO_ATTACHMENT_FORWARD_TO);
      return;
    }

    console.log(`Processing ${attachments.length} attachment(s) from ${message.from}`);

    const form = new FormData();
    for (const attachment of attachments) {
      const blob = new Blob([attachment.content], { type: attachment.mimeType });
      form.append("file", blob, attachment.filename || "attachment");
    }
    form.append("from", message.from);
    form.append("to", message.to);
    form.append("subject", parsed.subject || "");

    const res = await fetch(env.ATTACHMENT_ENDPOINT, {
      method: "POST",
      body: form,
      headers: {
        "CF-Access-Client-Id": env.CF_CLIENT_ID,
        "CF-Access-Client-Secret": env.CF_CLIENT_SECRET
      }
    });

    if (!res.ok) {
      console.error(`Failed to upload attachments: ${res.status} ${res.statusText}`);
    }
  },
};
