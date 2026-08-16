import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { uploadImageToStorage } from "@/features/scan/upload-image";

afterEach(() => {
  jest.restoreAllMocks();
});

describe("uploadImageToStorage", () => {
  it("validates a JPEG and uploads its exact bytes once", async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({ arrayBuffer: async () => bytes.buffer } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ storageId: "storage-1" }),
      } as Response);

    await expect(uploadImageToStorage("https://upload.example", "file://meal.jpg")).resolves.toEqual(
      { storageId: "storage-1" },
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: bytes,
    });
  });

  it("does not send unreadable or mislabeled bytes", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValueOnce({
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    } as Response);

    await expect(uploadImageToStorage("https://upload.example", "file://bad.jpg")).rejects.toThrow(
      "image_unreadable",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
