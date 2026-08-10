import {
  createError,
  getRequestURL,
  setHeader,
} from "h3";

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const contactEmail = String(
    config.securityContactEmail || "",
  ).trim();

  // RFC 9116 requires a real, maintained contact method.
  // Returning 404 is safer than publishing a fake or stale address.
  if (!contactEmail) {
    throw createError({
      statusCode: 404,
      statusMessage: "Security contact is not configured",
    });
  }

  const origin = getRequestURL(event).origin;
  const expires = new Date(
    Date.now() + 180 * 24 * 60 * 60 * 1000,
  ).toISOString();

  setHeader(
    event,
    "Content-Type",
    "text/plain; charset=utf-8",
  );
  setHeader(
    event,
    "Cache-Control",
    "public, max-age=86400",
  );

  return [
    `Contact: mailto:${contactEmail}`,
    `Expires: ${expires}`,
    `Canonical: ${origin}/.well-known/security.txt`,
    "Preferred-Languages: en",
    "",
  ].join("\n");
});
