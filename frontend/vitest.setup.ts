import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
// jsdom does not implement layout/scrolling
Element.prototype.scrollIntoView = () => {};
// jsdom's File lacks .text(); every supported browser has it.
if (!File.prototype.text) {
  File.prototype.text = function (this: File) {
    return new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsText(this); });
  };
}
