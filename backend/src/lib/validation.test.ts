import { describe, expect, it } from "vitest";
import { profileInputSchema } from "./validation";

const validProfile = {
  pastorName: "Publisher Name",
  churchLogoUrl: "https://res.cloudinary.com/example/image/upload/logo.png",
};

describe("profileInputSchema", () => {
  it("accepts a valid organization logo URL", () => {
    expect(profileInputSchema.safeParse(validProfile).success).toBe(true);
  });

  it("accepts an empty logo URL to clear the saved logo", () => {
    expect(
      profileInputSchema.safeParse({ ...validProfile, churchLogoUrl: "" })
        .success,
    ).toBe(true);
  });

  it("rejects an invalid organization logo URL", () => {
    expect(
      profileInputSchema.safeParse({
        ...validProfile,
        churchLogoUrl: "not-a-url",
      }).success,
    ).toBe(false);
  });
});
