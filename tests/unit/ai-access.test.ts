import { describe, expect, it } from "vitest";
import { aiAllowedFor } from "@/lib/ai/access";

describe("aiAllowedFor", () => {
  it("cho mọi tài khoản khi chưa đặt danh sách", () => {
    expect(aiAllowedFor("a@example.test", undefined)).toBe(true);
    expect(aiAllowedFor("a@example.test", " , ")).toBe(true);
  });
  it("chỉ cho email trong danh sách, không phân biệt hoa thường và khoảng trắng", () => {
    const list = " Me@Example.test, friend@example.test ";
    expect(aiAllowedFor("me@example.test", list)).toBe(true);
    expect(aiAllowedFor("FRIEND@example.test", list)).toBe(true);
    expect(aiAllowedFor("other@example.test", list)).toBe(false);
    expect(aiAllowedFor(null, list)).toBe(false);
  });
});
