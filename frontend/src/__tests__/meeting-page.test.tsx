import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MeetingPage from "@/app/meetings/[id]/page";
import { ToastProvider } from "@/components/Toast";
import type { MeetingDetail } from "@/lib/api";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "1" }), useRouter: () => ({ push }), usePathname: () => "/meetings/1" }));
vi.mock("next/link", () => ({ default: ({ href, children, ...r }: { href: string; children: React.ReactNode }) => <a href={href} {...r}>{children}</a> }));

const meeting: MeetingDetail = {
  id: 1, title: "Roadmap Sync", started_at: "2026-03-02T10:00:00", duration_ms: 40_000, media_url: null,
  participants: ["Ann", "Bob"],
  segments: [
    { id: 1, idx: 0, speaker: "Ann", start_ms: 0, end_ms: 9000, text: "Welcome to the roadmap review." },
    { id: 2, idx: 1, speaker: "Bob", start_ms: 10000, end_ms: 19000, text: "Pricing is up. Pricing test next." },
    { id: 3, idx: 2, speaker: "Ann", start_ms: 20000, end_ms: 29000, text: "Let's discuss mobile." },
    { id: 4, idx: 3, speaker: "Bob", start_ms: 30000, end_ms: 40000, text: "I will share the PRICING deck. Cost ($5.00) matters." },
  ],
  summary: { overview: "They reviewed pricing.", keywords: ["pricing"], notes: ["Note one"], source: "seed" },
  chapters: [{ id: 1, start_ms: 0, title: "Intro" }, { id: 2, start_ms: 20000, title: "Mobile chapter" }],
  action_items: [{ id: 7, meeting_id: 1, text: "Share deck", assignee: "Bob", due_date: null, completed: false }],
};

const apiMock = vi.hoisted(() => ({
  getMeeting: vi.fn(), updateMeeting: vi.fn(), deleteMeeting: vi.fn(),
  addActionItem: vi.fn(), updateActionItem: vi.fn(), deleteActionItem: vi.fn(),
}));
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: apiMock }));

const renderPage = async () => {
  render(<ToastProvider><MeetingPage /></ToastProvider>);
  await screen.findByText("Roadmap Sync");
};
const row = (text: RegExp) => screen.getByText(text).closest("[data-idx]") as HTMLElement;
const slider = () => screen.getByLabelText("Seek") as HTMLInputElement;

beforeEach(() => { Object.values(apiMock).forEach((f) => f.mockReset()); apiMock.getMeeting.mockResolvedValue(structuredClone(meeting)); push.mockReset(); });
afterEach(() => vi.useRealTimers());

describe("transcript ↔ player sync", () => {
  it("renders summary, chapters, transcript and action items", async () => {
    await renderPage();
    expect(screen.getByText("They reviewed pricing.")).toBeInTheDocument();
    expect(screen.getByText("Mobile chapter")).toBeInTheDocument();
    expect(screen.getByText("Share deck")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-idx]")).toHaveLength(4);
  });

  it("clicking a transcript line seeks the player and starts playback", async () => {
    await renderPage();
    fireEvent.click(row(/discuss mobile/));
    expect(slider().value).toBe("20000");
    expect(screen.getByText("0:20 / 0:40")).toBeInTheDocument();
    expect(screen.getByLabelText("Pause")).toBeInTheDocument();
    expect(row(/discuss mobile/)).toHaveClass("active");
  });

  it("moving the seek bar updates the active transcript line (player → transcript)", async () => {
    await renderPage();
    expect(row(/Welcome/)).toHaveClass("active");
    fireEvent.change(slider(), { target: { value: "31000" } });
    expect(row(/PRICING deck/)).toHaveClass("active");
    expect(row(/Welcome/)).not.toHaveClass("active");
    fireEvent.change(slider(), { target: { value: "9999" } }); // gap between segments keeps previous line
    expect(row(/Welcome/)).toHaveClass("active");
  });

  it("clicking an outline chapter seeks to its timestamp", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Mobile chapter/ }));
    expect(slider().value).toBe("20000");
    expect(row(/discuss mobile/)).toHaveClass("active");
  });

  it("playback advances the active line over time and stops at the end", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "performance", "Date"] });
    await act(async () => { render(<ToastProvider><MeetingPage /></ToastProvider>); await vi.advanceTimersByTimeAsync(0); });
    fireEvent.click(screen.getByLabelText("Play"));
    await act(async () => { await vi.advanceTimersByTimeAsync(10_500); });
    expect(row(/Pricing is up/)).toHaveClass("active");
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(slider().value).toBe("40000");
    expect(screen.getByLabelText("Play")).toBeInTheDocument(); // stopped, not looping
  });

  it("playback speed changes how fast the clock moves", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "performance", "Date"] });
    await act(async () => { render(<ToastProvider><MeetingPage /></ToastProvider>); await vi.advanceTimersByTimeAsync(0); });
    fireEvent.change(screen.getByLabelText("Playback speed"), { target: { value: "2" } });
    fireEvent.click(screen.getByLabelText("Play"));
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(Number(slider().value)).toBeGreaterThanOrEqual(9_500);
    expect(Number(slider().value)).toBeLessThanOrEqual(10_500);
  });
});

describe("transcript search", () => {
  it("highlights every match, counts them, and navigates", async () => {
    await renderPage();
    const input = screen.getByLabelText("Search transcript");
    fireEvent.change(input, { target: { value: "pricing" } });
    expect(document.querySelectorAll(".t-scroll mark")).toHaveLength(3); // case-insensitive, 2 + 1
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(document.querySelector("mark.current")).toHaveAttribute("data-occ", "0");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    expect(document.querySelector("mark.current")).toHaveAttribute("data-occ", "1");
    fireEvent.click(screen.getByLabelText("Previous match"));
    fireEvent.click(screen.getByLabelText("Previous match"));
    expect(screen.getByText("3 of 3")).toBeInTheDocument(); // wraps
  });
  it("shows 'No matches' and treats regex characters literally", async () => {
    await renderPage();
    const input = screen.getByLabelText("Search transcript");
    fireEvent.change(input, { target: { value: "zzz" } });
    expect(screen.getByText("No matches")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "($5.00)" } });
    expect(document.querySelectorAll(".t-scroll mark")).toHaveLength(1);
    fireEvent.change(input, { target: { value: "(" } }); // would throw if used as a raw regex
    expect(document.querySelectorAll(".t-scroll mark")).toHaveLength(1);
  });
});

describe("meeting CRUD", () => {
  it("edits title and participants", async () => {
    apiMock.updateMeeting.mockResolvedValue({ ...meeting, title: "Renamed", participants: ["Ann", "Cy"] });
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    const dlg = screen.getByRole("dialog");
    const [title, people] = within(dlg).getAllByRole("textbox");
    await userEvent.clear(title); await userEvent.type(title, "Renamed");
    await userEvent.clear(people); await userEvent.type(people, "Ann,  Cy ,");
    await userEvent.click(within(dlg).getByRole("button", { name: "Save" }));
    expect(apiMock.updateMeeting).toHaveBeenCalledWith(1, { title: "Renamed", participants: ["Ann", "Cy"] });
    expect(await screen.findByRole("heading", { name: "Renamed" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await screen.findByText("Meeting updated")).toBeInTheDocument(); // toast
  });
  it("validates edit form and surfaces server errors", async () => {
    apiMock.updateMeeting.mockRejectedValue(new Error("boom"));
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    const dlg = screen.getByRole("dialog");
    await userEvent.clear(within(dlg).getAllByRole("textbox")[0]);
    await userEvent.click(within(dlg).getByRole("button", { name: "Save" }));
    expect(within(dlg).getByRole("alert")).toHaveTextContent("Title is required");
    expect(apiMock.updateMeeting).not.toHaveBeenCalled();
    await userEvent.type(within(dlg).getAllByRole("textbox")[0], "X");
    await userEvent.click(within(dlg).getByRole("button", { name: "Save" }));
    expect(await within(dlg).findByRole("alert")).toHaveTextContent("boom");
  });
  it("deletes only after confirmation, then returns to the library", async () => {
    apiMock.deleteMeeting.mockResolvedValue(undefined);
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(apiMock.deleteMeeting).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(apiMock.deleteMeeting).toHaveBeenCalledWith(1));
    expect(push).toHaveBeenCalledWith("/");
  });
  it("shows a friendly state for a missing meeting", async () => {
    const { ApiError } = await import("@/lib/api");
    apiMock.getMeeting.mockRejectedValue(new ApiError(404, "Meeting not found"));
    render(<ToastProvider><MeetingPage /></ToastProvider>);
    expect(await screen.findByText(/doesn't exist/)).toBeInTheDocument();
  });
});

describe("action items", () => {
  it("completes optimistically and rolls back with an error toast on failure", async () => {
    let reject!: (e: Error) => void;
    apiMock.updateActionItem.mockReturnValue(new Promise((_, r) => { reject = r; }));
    await renderPage();
    const box = screen.getByRole("checkbox") as HTMLInputElement;
    fireEvent.click(box);
    expect(box.checked).toBe(true); // optimistic
    await act(async () => reject(new Error("offline")));
    expect(box.checked).toBe(false);
    expect(await screen.findByText("offline")).toBeInTheDocument();
  });
  it("completes, adds, edits and deletes", async () => {
    apiMock.updateActionItem.mockImplementation(async (id, d) => ({ ...meeting.action_items[0], id, ...d }));
    apiMock.addActionItem.mockResolvedValue({ id: 8, meeting_id: 1, text: "Write docs", assignee: null, due_date: null, completed: false });
    apiMock.deleteActionItem.mockResolvedValue(undefined);
    await renderPage();
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(apiMock.updateActionItem).toHaveBeenCalledWith(7, { completed: true }));

    await userEvent.type(screen.getByLabelText("New action item"), "Write docs");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("Write docs")).toBeInTheDocument();
    expect(apiMock.addActionItem).toHaveBeenCalledWith(1, { text: "Write docs", assignee: null, due_date: null });

    await userEvent.click(screen.getAllByLabelText("Edit action item")[0]);
    const txt = screen.getByLabelText("Action item text");
    await userEvent.clear(txt); await userEvent.type(txt, "Share the deck");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Share the deck")).toBeInTheDocument();

    await userEvent.click(screen.getAllByLabelText("Delete action item")[1]);
    await waitFor(() => expect(screen.queryByText("Write docs")).toBeNull());
    expect(apiMock.deleteActionItem).toHaveBeenCalledWith(8);
  });
  it("won't add a blank item", async () => {
    await renderPage();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });
});
