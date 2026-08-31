import type {
  Page,
} from "playwright-core";

export function watchPageProblems(
  page: Page,
): string[] {
  const problems: string[] = [];

  page.on(
    "pageerror",
    (error) => {
      problems.push(
        `pageerror: ${error.message}`,
      );
    },
  );

  page.on(
    "console",
    (message) => {
      if (
        message.type()
        === "error"
      ) {
        problems.push(
          `console.error: ${message.text()}`,
        );
      }
    },
  );

  page.on(
    "response",
    (response) => {
      if (
        response.status()
        >= 500
      ) {
        problems.push(
          `HTTP ${response.status()}: ${response.url()}`,
        );
      }
    },
  );

  return problems;
}
