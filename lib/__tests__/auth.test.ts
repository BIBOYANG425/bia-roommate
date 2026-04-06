import { describe, it, expect } from "vitest";
import { isSchoolEmail, getSchoolFromEmail } from "../auth";

describe("isSchoolEmail", () => {
  it("accepts direct school domains", () => {
    expect(isSchoolEmail("user@usc.edu")).toBe(true);
    expect(isSchoolEmail("user@berkeley.edu")).toBe(true);
    expect(isSchoolEmail("user@stanford.edu")).toBe(true);
  });

  it("accepts subdomains", () => {
    expect(isSchoolEmail("user@mail.usc.edu")).toBe(true);
    expect(isSchoolEmail("user@cs.berkeley.edu")).toBe(true);
    expect(isSchoolEmail("user@cs.stanford.edu")).toBe(true);
  });

  it("rejects non-school emails", () => {
    expect(isSchoolEmail("user@gmail.com")).toBe(false);
    expect(isSchoolEmail("user@fakeusc.edu")).toBe(false);
    expect(isSchoolEmail("user@notusc.edu.cn")).toBe(false);
  });

  it("rejects empty or malformed input", () => {
    expect(isSchoolEmail("")).toBe(false);
    expect(isSchoolEmail("nodomain")).toBe(false);
    expect(isSchoolEmail("@usc.edu")).toBe(true); // valid domain, empty local part
  });

  it("is case insensitive", () => {
    expect(isSchoolEmail("User@USC.EDU")).toBe(true);
    expect(isSchoolEmail("User@Berkeley.Edu")).toBe(true);
  });
});

describe("getSchoolFromEmail", () => {
  it("maps USC domains", () => {
    expect(getSchoolFromEmail("a@usc.edu")).toBe("USC");
    expect(getSchoolFromEmail("a@mail.usc.edu")).toBe("USC");
  });

  it("maps Berkeley domains", () => {
    expect(getSchoolFromEmail("a@berkeley.edu")).toBe("UC Berkeley");
    expect(getSchoolFromEmail("a@cs.berkeley.edu")).toBe("UC Berkeley");
  });

  it("maps Stanford domains", () => {
    expect(getSchoolFromEmail("a@stanford.edu")).toBe("Stanford");
  });

  it("returns null for non-school emails", () => {
    expect(getSchoolFromEmail("a@gmail.com")).toBeNull();
    expect(getSchoolFromEmail("")).toBeNull();
  });
});
