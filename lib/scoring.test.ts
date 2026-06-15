import { describe, it, expect } from "vitest";
import { computePoints, computeDayBonus } from "./scoring";

describe("computePoints — examples from the spec", () => {
  it("2-1 vs 2-1 → 5 (exact)", () => {
    expect(computePoints(2, 1, 2, 1)).toBe(5);
  });

  it("3-1 vs 2-0 → 3 (outcome + goal difference)", () => {
    expect(computePoints(3, 1, 2, 0)).toBe(3);
  });

  it("1-1 vs 2-2 → 3 (outcome + goal difference)", () => {
    expect(computePoints(1, 1, 2, 2)).toBe(3);
  });

  it("2-0 vs 2-1 → 2 (outcome only)", () => {
    expect(computePoints(2, 0, 2, 1)).toBe(2);
  });

  it("1-1 vs 2-1 → 0 (nothing)", () => {
    expect(computePoints(1, 1, 2, 1)).toBe(0);
  });
});

describe("computePoints — extra cases", () => {
  it("never exceeds 5 on an exact draw", () => {
    expect(computePoints(0, 0, 0, 0)).toBe(5);
  });

  it("away win outcome only", () => {
    expect(computePoints(0, 1, 1, 3)).toBe(2);
  });

  it("wrong outcome but it is not exact → 0", () => {
    expect(computePoints(0, 2, 1, 0)).toBe(0);
  });
});

describe("computeDayBonus", () => {
  it("single last place gets +2", () => {
    const bonus = computeDayBonus([
      { userId: "a", points: 10 },
      { userId: "b", points: 5 },
      { userId: "c", points: 2 }, // last
    ]);
    expect(bonus.get("c")).toBe(2);
    expect(bonus.has("a")).toBe(false);
    expect(bonus.has("b")).toBe(false);
  });

  it("tie for last place: each tied user gets +1", () => {
    const bonus = computeDayBonus([
      { userId: "a", points: 8 },
      { userId: "b", points: 3 }, // tied last
      { userId: "c", points: 3 }, // tied last
    ]);
    expect(bonus.get("b")).toBe(1);
    expect(bonus.get("c")).toBe(1);
    expect(bonus.has("a")).toBe(false);
  });

  it("all equal → everyone is last → +1 each", () => {
    const bonus = computeDayBonus([
      { userId: "a", points: 4 },
      { userId: "b", points: 4 },
    ]);
    expect(bonus.get("a")).toBe(1);
    expect(bonus.get("b")).toBe(1);
  });

  it("empty input → no bonus", () => {
    expect(computeDayBonus([]).size).toBe(0);
  });
});
