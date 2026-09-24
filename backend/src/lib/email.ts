const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

function getPublicAppUrl() {
  const configuredUrl = (
    process.env.PUBLIC_APP_URL ||
    process.env.FRONTEND_ORIGIN ||
    ""
  )
    .split(",")[0]
    .trim()
    .replace(/\/$/, "");

  const isPlaceholder =
    configuredUrl === "https://your-live-frontend-domain.com";
  const isLocalhost = /^https?:\/\/localhost(?::\d+)?$/i.test(configuredUrl);

  if (
    process.env.NODE_ENV === "production" &&
    (!configuredUrl || isPlaceholder || isLocalhost)
  ) {
    throw new Error(
      "PUBLIC_APP_URL must be set to the deployed frontend URL before sending emails.",
    );
  }

  return configuredUrl || "http://localhost:3000";
}

function getBrevoConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM;
  const fromName = process.env.BREVO_SENDER_NAME || "Publishing Studio";

  if (!apiKey || !fromEmail) {
    throw new Error("BREVO_API_KEY and BREVO_SENDER_EMAIL must be configured.");
  }

  return { apiKey, fromEmail, fromName };
}

async function sendBrevoEmail(payload: {
  to: { email: string }[];
  subject: string;
  htmlContent: string;
  textContent: string;
}) {
  const { apiKey, fromEmail, fromName } = getBrevoConfig();

  const response = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: fromName,
        email: fromEmail,
      },
      ...payload,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Email provider rejected the message: ${details}`);
  }
}

export async function sendVerificationCode(email: string, code: string) {
  await sendBrevoEmail({
    to: [{ email }],
    subject: "Your Publishing Studio verification code",
    htmlContent: `
      <p>Your Publishing Studio verification code is <strong>${code}</strong>.</p>
      <p>It expires in 10 minutes. If you did not request this code, you can ignore this email.</p>
    `,
    textContent: `Your Publishing Studio verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = getPublicAppUrl();
  const resetUrl = `${baseUrl}/admin/reset-password?token=${encodeURIComponent(token)}`;

  await sendBrevoEmail({
    to: [{ email }],
    subject: "Reset your Publishing Studio password",
    htmlContent: `<p>We received a request to reset your Publishing Studio password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>`,
    textContent: `Reset your Publishing Studio password: ${resetUrl}\n\nThis link expires in 30 minutes. If you did not request this, you can ignore this email.`,
  });
}

export async function sendNewsletterConfirmationEmail(
  email: string,
  token: string,
) {
  const baseUrl = getPublicAppUrl();
  const confirmationUrl = `${baseUrl}/newsletter/confirm?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  await sendBrevoEmail({
    to: [{ email }],
    subject: "Confirm your newsletter subscription",
    htmlContent: `<p>Confirm your subscription to receive new article updates.</p><p><a href="${confirmationUrl}">Confirm subscription</a></p><p>If you did not request this, you can ignore this email.</p>`,
    textContent: `Confirm your newsletter subscription: ${confirmationUrl}\n\nIf you did not request this, you can ignore this email.`,
  });
}

export async function sendNewsletterNotification(params: {
  subject?: string;
  articleTitle: string;
  articleSlug: string;
  articleImage?: string | null;
  excerpt?: string | null;
  publisherName?: string | null;
  publisherTitle?: string | null;
  publisherChurch?: string | null;
  publisherEmail?: string | null;
  publisherProfileImage?: string | null;
  subscribers: Array<{ email: string; unsubscribeToken: string }>;
}) {
  const siteBase = getPublicAppUrl();
  const articleUrl = `${siteBase}/articles/${params.articleSlug}`;

  if (params.subscribers.length === 0) {
    return { sent: 0 };
  }

  const siteName = process.env.APP_NAME || "Publishing Studio";
  const publisherName = params.publisherName || siteName;
  const publisherTitle = params.publisherTitle || "Editor";
  const publisherChurch = params.publisherChurch || "";
  const publisherEmail = params.publisherEmail || "";
  const profileImage = params.publisherProfileImage || "";
  const articleImage = params.articleImage || "";
  const publisherLine = [
    publisherName,
    publisherTitle && publisherTitle !== "Editor" ? `• ${publisherTitle}` : "",
    publisherChurch,
  ]
    .filter(Boolean)
    .join(" ");

  const publisherAvatarMarkup = profileImage
    ? `<img src="${profileImage}" alt="${publisherName}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid #e5e7eb; margin-right: 12px; vertical-align: middle;" />`
    : "";

  const articleImageMarkup = articleImage
    ? `<div style="margin: 18px 0 24px;"><img src="${articleImage}" alt="${params.articleTitle}" style="width: 100%; max-height: 260px; object-fit: cover; border-radius: 12px; border: 1px solid #e5e7eb;" /></div>`
    : "";

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background: #f8fafc; padding: 24px;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);">
        <div style="margin-bottom: 18px; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b7280; font-weight: 700;">
          ${siteName}
        </div>

        <div style="display: flex; align-items: center; margin-bottom: 18px;">
          ${publisherAvatarMarkup}
          <div>
            <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; font-weight: 700;">Published by</div>
            <div style="font-size: 18px; color: #111827; font-weight: 700;">${publisherName}</div>
          </div>
        </div>

        <h2 style="margin: 0 0 12px; font-size: 30px; line-height: 1.2; color: #111827;">New article published</h2>
        <p style="margin: 0 0 18px; font-size: 16px; color: #374151;">
          A fresh article has just been published by <strong>${publisherName}</strong>
          ${publisherChurch ? `from ${publisherChurch}` : ""}.
        </p>

        ${articleImageMarkup}

        <div style="background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%); border-left: 4px solid #2563eb; padding: 18px 20px; border-radius: 12px; margin-bottom: 18px;">
          <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #4b5563; margin-bottom: 8px; font-weight: 700;">
            Featured article
          </div>
          <h3 style="margin: 0; font-size: 24px; line-height: 1.3; color: #111827;">${params.articleTitle}</h3>
        </div>

        <p style="margin: 0 0 20px; font-size: 16px; color: #374151; line-height: 1.7;">
          ${(params.excerpt || "").replace(/<[^>]*>/g, "").slice(0, 220) || "Read the article to learn more."}
        </p>

        <p style="margin: 0 0 22px;">
          <a href="${articleUrl}" style="display: inline-block; padding: 12px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700;">Read the full article</a>
        </p>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 18px; margin-top: 18px; color: #4b5563; font-size: 14px; line-height: 1.8;">
          <p style="margin: 0 0 8px;"><strong>Published by:</strong> ${publisherLine}</p>
          ${publisherEmail ? `<p style="margin: 0 0 8px;"><strong>Contact:</strong> <a href="mailto:${publisherEmail}" style="color: #1d4ed8; text-decoration: none;">${publisherEmail}</a></p>` : ""}
          <p style="margin: 0 0 12px;">You are receiving this because you subscribed to updates from ${siteName}.</p>
          <p style="margin: 0 0 10px;">
            <a href="${siteBase}" style="color: #1d4ed8; text-decoration: none; font-weight: 600;">Visit our website</a>
          </p>
          <p style="margin: 0;">
            <a href="${siteBase}/unsubscribe?email=__EMAIL__&token=__TOKEN__" style="color: #1d4ed8;">Unsubscribe</a>
          </p>
        </div>

        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; line-height: 1.7;">
          <p style="margin: 0;">With gratitude,<br /><strong>${publisherName}</strong>${publisherChurch ? ` • ${publisherChurch}` : ""}</p>
        </div>
      </div>
    </div>
  `;

  const textContent = `New article published: ${params.articleTitle}\nPublished by: ${publisherName}${publisherChurch ? ` from ${publisherChurch}` : ""}\n${params.excerpt || "Read the article to learn more."}\nRead it here: ${articleUrl}\n\nVisit: ${siteBase}\nContact: ${publisherEmail || "not provided"}`;

  const recipients = params.subscribers.map((subscriber) => ({
    email: subscriber.email,
  }));

  const payloads = recipients.map((recipient, index) => ({
    to: [recipient],
    subject: params.subject || `New article: ${params.articleTitle}`,
    htmlContent: htmlContent
      .replace(/__EMAIL__/g, encodeURIComponent(recipient.email))
      .replace(/__TOKEN__/g, params.subscribers[index].unsubscribeToken),
    textContent,
  }));

  for (const payload of payloads) {
    await sendBrevoEmail(payload);
  }

  return { sent: payloads.length };
}
