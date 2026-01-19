import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";
import nodemailer from "nodemailer";

const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET_KEY ?? "";

type CaptchaResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await req.json()) as {
    name?: string;
    email?: string;
    vid?: string;
    title?: string;
    message?: string;
    honeypot?: string;
    token?: string;
  };

  if (payload.honeypot) {
    return NextResponse.json({ ok: true });
  }

  const token = String(payload.token ?? "").trim();
  if (!token) {
    return NextResponse.json({ error: "Missing captcha" }, { status: 400 });
  }

  if (!HCAPTCHA_SECRET) {
    return NextResponse.json({ error: "Captcha secret missing" }, { status: 500 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  const captcha = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: HCAPTCHA_SECRET,
      response: token,
      ...(ip ? { remoteip: ip } : {}),
    }),
  }).then((res) => res.json() as Promise<CaptchaResponse>);

  if (!captcha.success) {
    const details = (captcha["error-codes"] ?? []).join(", ");
    return NextResponse.json(
      { error: details ? `Captcha failed: ${details}` : "Captcha failed" },
      { status: 400 },
    );
  }

  const name = String(payload.name ?? "").trim();
  const email = String(payload.email ?? "").trim() || null;
  const vid = String(payload.vid ?? "").trim() || null;
  const title = String(payload.title ?? "").trim() || null;
  const message = String(payload.message ?? "").trim();

  if (!name || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const userAgent = req.headers.get("user-agent");

  const entry = await prisma.feedbackSubmission.create({
    data: {
      name,
      email,
      vid,
      title,
      message,
      userId: session.user.id,
      userAgent,
      ip,
    },
  });

  const config = await getSiteConfig();
  const smtpReady =
    config.smtpHost &&
    config.smtpPort &&
    config.smtpUser &&
    config.smtpPass &&
    config.smtpFrom;

  if (smtpReady) {
    try {
      const port = Number.parseInt(config.smtpPort, 10);
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: Number.isFinite(port) ? port : 587,
        secure: port === 465,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });
      const to = config.supportEmail || "pt-hq@ivao.aero";
      const subject = title ? `Feedback: ${title}` : "Feedback: new submission";
      const text = [
        `Name: ${name}`,
        `Email: ${email ?? "-"}`,
        `VID: ${vid ?? "-"}`,
        "",
        message,
        "",
        `Submission ID: ${entry.id}`,
      ].join("\n");
      await transporter.sendMail({
        from: config.smtpFrom,
        to,
        replyTo: email ?? undefined,
        subject,
        text,
      });
    } catch {
      return NextResponse.json({ error: "Email delivery failed" }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: true });
}
