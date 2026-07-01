import { beforeEach, describe, expect, it, vi } from "vitest";
import { encryptSecret } from "./security";

const prismaMock = vi.hoisted(() => ({
  googleCalendarConnection: {
    findUnique: vi.fn(),
  },
  task: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  objectAssociation: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  activity: {
    create: vi.fn(),
  },
  operationalEvent: {
    create: vi.fn(),
  },
}));

vi.mock("./prisma", () => ({ prisma: prismaMock }));

import { deleteTaskGoogleEventSafely } from "./google-calendar";

describe("Google task calendar deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    process.env.GOOGLE_CALENDAR_INTEGRATION_ENABLED = "true";
    prismaMock.googleCalendarConnection.findUnique.mockResolvedValue({
      id: "connection-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000002",
      encryptedAccessToken: encryptSecret("access-token"),
      encryptedRefreshToken: null,
      accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      selectedWriteCalendarId: "primary",
      selectedWriteCalendarName: "Primary",
      status: "CONNECTED",
    });
    prismaMock.task.findUnique.mockResolvedValue(null);
    prismaMock.task.update.mockResolvedValue({});
    prismaMock.objectAssociation.findFirst.mockResolvedValue(null);
  });

  it("calls Google DELETE and clears task calendar fields on success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await deleteTaskGoogleEventSafely({
      organizationId: "00000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000002",
      calendarId: "primary",
      eventId: "event-1",
      taskId: "00000000-0000-0000-0000-000000000003",
      clearTaskOnSuccess: true,
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/calendars/primary/events/event-1"),
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(prismaMock.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "00000000-0000-0000-0000-000000000003" },
        data: expect.objectContaining({
          calendarSyncEnabled: false,
          calendarSyncStatus: "NOT_REQUIRED",
          googleCalendarId: null,
          googleEventId: null,
          googleEventHtmlLink: null,
        }),
      }),
    );
  });

  it("keeps the CRM task and records ERROR when Google DELETE fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { status: "INTERNAL" } }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await deleteTaskGoogleEventSafely({
      organizationId: "00000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000002",
      calendarId: "primary",
      eventId: "event-1",
      taskId: "00000000-0000-0000-0000-000000000003",
      clearTaskOnSuccess: true,
    });

    expect(result.ok).toBe(false);
    expect(prismaMock.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "00000000-0000-0000-0000-000000000003" },
        data: expect.objectContaining({
          calendarSyncStatus: "ERROR",
          calendarSyncErrorCode: "INTERNAL",
          calendarSyncErrorMessage:
            "Google Calendarイベントの削除に失敗しました。",
        }),
      }),
    );
  });
});
