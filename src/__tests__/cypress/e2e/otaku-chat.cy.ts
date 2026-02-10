/**
 * E2E Tests for Otaku Agent Chat
 *
 * Ensures that selecting Otaku and sending "What can you do?" results in a visible
 * reply and that "Analyzing your request" is eventually replaced.
 *
 * Prerequisites: Run against a running app (bun start) with local messaging and
 * default message server so replies reach the UI. See OTAKU.md § Testing / Replying
 * and tasks/FRONTEND-ALPHA-QUICKSTART.md.
 */

describe("Otaku Chat E2E", () => {
  const RESPONSE_TIMEOUT_MS = 30000;
  const CAPABILITY_REGEX = /swap|bridge|portfolio|token|market|transfer|insight/i;

  beforeEach(() => {
    cy.visit("/");
    cy.get(
      'a[href*="chat"], a[href*="agent"], button:contains("chat"), button:contains("agent")',
      { timeout: 5000 },
    )
      .first()
      .click({ force: true });
  });

  it("selects Otaku, sends 'What can you do?', and shows a reply with capability keywords", () => {
    // Open agent selector (button that shows current agent and "Select agent")
    cy.contains("Select agent", { timeout: 8000 }).click();

    // Select Otaku from the dropdown
    cy.contains("button", "Otaku", { timeout: 3000 }).click();

    // Ensure chat input is available
    cy.get('input[type="text"], textarea, [contenteditable="true"]')
      .filter(":visible")
      .first()
      .should("be.visible");

    // Send the message
    cy.get('input[type="text"], textarea, [contenteditable="true"]')
      .filter(":visible")
      .first()
      .type("What can you do?{enter}");

    // User message should appear
    cy.contains("What can you do?", { timeout: 10000 }).should("be.visible");

    // Wait for analyzing/typing indicator to disappear (may not appear if response is fast)
    cy.contains("Analyzing your request", { timeout: RESPONSE_TIMEOUT_MS }).should(
      "not.exist",
    );

    // Within timeout, an agent reply should be visible and contain at least one capability keyword
    cy.contains(CAPABILITY_REGEX, { timeout: RESPONSE_TIMEOUT_MS }).should(
      "be.visible",
    );
  });
});
