import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateMeetingModal from "@/components/CreateMeetingModal";
import Library from "@/app/page";
import { ToastProvider } from "@/components/Toast";
import type { MeetingListItem } from "@/lib/api";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/" }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));

const apiMock = vi.hoisted(() => ({ listMeetings: vi.fn(), participants: vi.fn(), createMeeting: vi.fn() }));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: apiMock }));

const item = (id: number, title: string, iso = "2026-03-02T10:00:00"): MeetingListItem => ({
  id, title, started_at: iso, duration_ms: 120_000, participants: ["Ann", "Bob", "Cy", "Di", "Ed"],
  open_action_items: 2, total_action_items: 3, overview_preview: "preview",
});
const renderLib = () => render(<ToastProvider><Library /></ToastProvider>);

beforeEach(() => {
  Object.values(apiMock).forEach((f) => f.mockReset()); push.mockReset();
  apiMock.participants.mockResolvedValue(["Ann", "Bob"]);
});

describe("library", () => {
  it("lists meetings grouped by day with participants and open-item pill", async () => {
    apiMock.listMeetings.mockResolvedValue({ items: [item(1, "Alpha"), item(2, "Beta"), item(3, "Gamma", "2026-03-01T09:00:00")], total: 3 });
    renderLib();
    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(document.querySelectorAll("h2.day")).toHaveLength(2);
    expect(screen.getAllByText("2 open")).toHaveLength(3);
    expect(screen.getAllByText(/\+2/).length).toBeGreaterThan(0); // 5 participants → 3 shown + 2
    expect(screen.getByText("3 meetings")).toBeInTheDocument();
    expect(screen.getByText("Alpha").closest("a")).toHaveAttribute("href", "/meetings/1");
  });

  it("debounces search and passes filters/sort to the API", async () => {
    apiMock.listMeetings.mockResolvedValue({ items: [item(1, "Alpha")], total: 1 });
    renderLib();
    await screen.findByText("Alpha");
    apiMock.listMeetings.mockClear();
    const box = screen.getByLabelText("Search meetings");
    await userEvent.type(box, "road");
    await waitFor(() => expect(apiMock.listMeetings).toHaveBeenCalled());
    expect(apiMock.listMeetings).toHaveBeenCalledTimes(1); // 4 keystrokes → 1 request
    expect(apiMock.listMeetings.mock.calls[0][0]).toMatchObject({ q: "road", sort: "recent" });
    fireEvent.change(screen.getByLabelText("Filter by participant"), { target: { value: "Bob" } });
    fireEvent.change(screen.getByLabelText("Sort"), { target: { value: "oldest" } });
    await waitFor(() => expect(apiMock.listMeetings.mock.lastCall![0]).toMatchObject({ participant: "Bob", sort: "oldest", q: "road" }));
  });

  it("a slow, stale response never overwrites a newer one", async () => {
    let resolveOld!: (v: unknown) => void;
    apiMock.listMeetings
      .mockResolvedValueOnce({ items: [item(1, "Initial")], total: 1 })
      .mockImplementationOnce(() => new Promise((r) => { resolveOld = r; }))   // for "a" — slow
      .mockResolvedValueOnce({ items: [item(2, "FreshResult")], total: 1 });    // for "ab" — fast
    renderLib();
    await screen.findByText("Initial");
    fireEvent.change(screen.getByLabelText("Search meetings"), { target: { value: "a" } });
    await waitFor(() => expect(apiMock.listMeetings).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByLabelText("Search meetings"), { target: { value: "ab" } });
    expect(await screen.findByText("FreshResult")).toBeInTheDocument();
    await act(async () => resolveOld({ items: [item(3, "StaleResult")], total: 1 }));
    expect(screen.queryByText("StaleResult")).toBeNull();
    expect(screen.getByText("FreshResult")).toBeInTheDocument();
  });

  it("empty state with filters offers clearing; error state offers retry", async () => {
    apiMock.listMeetings.mockResolvedValue({ items: [], total: 0 });
    renderLib();
    expect(await screen.findByText(/No meetings yet/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search meetings"), { target: { value: "zzz" } });
    expect(await screen.findByText(/No meetings match/)).toBeInTheDocument();
  });
  it("retries after a network error", async () => {
    apiMock.listMeetings.mockRejectedValueOnce(new Error("Cannot reach the server")).mockResolvedValueOnce({ items: [item(1, "Back")], total: 1 });
    renderLib();
    expect(await screen.findByText("Cannot reach the server")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Back")).toBeInTheDocument();
  });

  it("rejects an inverted date range without calling the API", async () => {
    apiMock.listMeetings.mockResolvedValue({ items: [item(1, "Alpha")], total: 1 });
    renderLib();
    await screen.findByText("Alpha");
    apiMock.listMeetings.mockClear();
    fireEvent.change(screen.getByLabelText(/^To/), { target: { value: "2026-01-01" } });
    await waitFor(() => expect(apiMock.listMeetings).toHaveBeenCalled());
    apiMock.listMeetings.mockClear();
    fireEvent.change(screen.getByLabelText(/^From/), { target: { value: "2026-02-01" } });
    expect(await screen.findByText(/must be on or before/)).toBeInTheDocument();
    expect(apiMock.listMeetings).not.toHaveBeenCalled();
  });

  it("load more appends without duplicating rows", async () => {
    apiMock.listMeetings
      .mockResolvedValueOnce({ items: [item(1, "One"), item(2, "Two")], total: 3 })
      .mockResolvedValueOnce({ items: [item(2, "Two"), item(3, "Three")], total: 3 });
    renderLib();
    await screen.findByText("One");
    await userEvent.click(screen.getByRole("button", { name: /Load more/ }));
    expect(await screen.findByText("Three")).toBeInTheDocument();
    expect(screen.getAllByText("Two")).toHaveLength(1);
    expect(apiMock.listMeetings.mock.lastCall![0]).toMatchObject({ offset: 2 });
  });
});

describe("create meeting modal", () => {
  const open = () => render(<ToastProvider><CreateMeetingModal onClose={vi.fn()} /></ToastProvider>);
  it("validates, then creates from pasted text and navigates", async () => {
    apiMock.createMeeting.mockResolvedValue({ id: 42 });
    open();
    await userEvent.click(screen.getByRole("button", { name: "Create meeting" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Title is required");
    await userEvent.type(screen.getByLabelText(/^Title/), "Pasted");
    await userEvent.click(screen.getByRole("button", { name: "Create meeting" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Paste a transcript");
    await userEvent.type(screen.getByLabelText(/^Transcript/), "Ann: hi there");
    await userEvent.type(screen.getByLabelText(/^Participants/), "Ann, Bob");
    await userEvent.click(screen.getByRole("button", { name: "Create meeting" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/meetings/42"));
    expect(apiMock.createMeeting).toHaveBeenCalledWith(expect.objectContaining({ title: "Pasted", transcript: "Ann: hi there", participants: ["Ann", "Bob"] }));
  });
  it("accepts a .vtt upload (title defaults to filename) and rejects wrong types", async () => {
    apiMock.createMeeting.mockResolvedValue({ id: 7 });
    open();
    await userEvent.click(screen.getByRole("button", { name: "Upload file" }));
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "notes.pdf")] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(".txt, .vtt or .json");
    fireEvent.change(input, { target: { files: [new File(["WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nAnn: hi"], "standup.vtt")] } });
    await waitFor(() => expect(screen.getByLabelText(/^Title/)).toHaveValue("standup"));
    await userEvent.click(screen.getByRole("button", { name: "Create meeting" }));
    await waitFor(() => expect(apiMock.createMeeting).toHaveBeenCalledWith(expect.objectContaining({ filename: "standup.vtt" })));
  });
  it("shows server-side parse errors and stays open", async () => {
    apiMock.createMeeting.mockRejectedValue(new Error("Invalid JSON: Expecting value"));
    open();
    await userEvent.type(screen.getByLabelText(/^Title/), "Bad");
    await userEvent.type(screen.getByLabelText(/^Transcript/), "hello");
    await userEvent.click(screen.getByRole("button", { name: "Create meeting" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid JSON");
    expect(screen.getByRole("button", { name: "Create meeting" })).toBeEnabled(); // can retry
  });
});
