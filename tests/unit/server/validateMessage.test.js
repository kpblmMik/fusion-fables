import { validateMessage } from "../../../src/server.js";

describe("validateMessage", () => {
    describe("valid input", () => {
        it("returns sanitized object for valid input", () => {
            const result = validateMessage({
                playerName: "Alice",
                message: "Hello world"
            });

            expect(result).toEqual({
                playerName: "Alice",
                message: "Hello world"
            });
        });

        it("trims whitespace from playerName", () => {
            const result = validateMessage({
                playerName: "  Alice  ",
                message: "Hello"
            });

            expect(result.playerName).toBe("Alice");
        });

        it("trims whitespace from message", () => {
            const result = validateMessage({
                playerName: "Alice",
                message: "  Hello world  "
            });

            expect(result.message).toBe("Hello world");
        });

        it("truncates playerName to 50 characters", () => {
            const longName = "A".repeat(100);
            const result = validateMessage({
                playerName: longName,
                message: "Hello"
            });

            expect(result.playerName.length).toBe(50);
            expect(result.playerName).toBe("A".repeat(50));
        });

        it("truncates message to 500 characters", () => {
            const longMessage = "B".repeat(1000);
            const result = validateMessage({
                playerName: "Alice",
                message: longMessage
            });

            expect(result.message.length).toBe(500);
            expect(result.message).toBe("B".repeat(500));
        });

        it("handles exact length limits", () => {
            const result = validateMessage({
                playerName: "A".repeat(50),
                message: "B".repeat(500)
            });

            expect(result.playerName.length).toBe(50);
            expect(result.message.length).toBe(500);
        });
    });

    describe("invalid input - returns null", () => {
        it("returns null for null input", () => {
            expect(validateMessage(null)).toBeNull();
        });

        it("returns null for undefined input", () => {
            expect(validateMessage(undefined)).toBeNull();
        });

        it("returns null for non-object input (string)", () => {
            expect(validateMessage("not an object")).toBeNull();
        });

        it("returns null for non-object input (number)", () => {
            expect(validateMessage(42)).toBeNull();
        });

        it("returns null for non-object input (array)", () => {
            expect(validateMessage(["Alice", "Hello"])).toBeNull();
        });

        it("returns null when playerName is not a string", () => {
            expect(validateMessage({
                playerName: 123,
                message: "Hello"
            })).toBeNull();
        });

        it("returns null when message is not a string", () => {
            expect(validateMessage({
                playerName: "Alice",
                message: 456
            })).toBeNull();
        });

        it("returns null when playerName is missing", () => {
            expect(validateMessage({
                message: "Hello"
            })).toBeNull();
        });

        it("returns null when message is missing", () => {
            expect(validateMessage({
                playerName: "Alice"
            })).toBeNull();
        });

        it("returns null for empty playerName after trim", () => {
            expect(validateMessage({
                playerName: "   ",
                message: "Hello"
            })).toBeNull();
        });

        it("returns null for empty message after trim", () => {
            expect(validateMessage({
                playerName: "Alice",
                message: "   "
            })).toBeNull();
        });

        it("returns null for empty string playerName", () => {
            expect(validateMessage({
                playerName: "",
                message: "Hello"
            })).toBeNull();
        });

        it("returns null for empty string message", () => {
            expect(validateMessage({
                playerName: "Alice",
                message: ""
            })).toBeNull();
        });

        it("returns null when both fields are null", () => {
            expect(validateMessage({
                playerName: null,
                message: null
            })).toBeNull();
        });

        it("returns null when playerName is an object", () => {
            expect(validateMessage({
                playerName: { name: "Alice" },
                message: "Hello"
            })).toBeNull();
        });

        it("returns null when message is an array", () => {
            expect(validateMessage({
                playerName: "Alice",
                message: ["Hello"]
            })).toBeNull();
        });
    });

    describe("edge cases", () => {
        it("handles single character inputs", () => {
            const result = validateMessage({
                playerName: "A",
                message: "B"
            });

            expect(result).toEqual({
                playerName: "A",
                message: "B"
            });
        });

        it("handles unicode characters", () => {
            const result = validateMessage({
                playerName: "Alice 🎮",
                message: "Hello 世界"
            });

            expect(result.playerName).toBe("Alice 🎮");
            expect(result.message).toBe("Hello 世界");
        });

        it("handles newlines in message", () => {
            const result = validateMessage({
                playerName: "Alice",
                message: "Hello\nWorld"
            });

            expect(result.message).toBe("Hello\nWorld");
        });

        it("preserves internal whitespace", () => {
            const result = validateMessage({
                playerName: "Alice Bob",
                message: "Hello   World"
            });

            expect(result.playerName).toBe("Alice Bob");
            expect(result.message).toBe("Hello   World");
        });

        it("handles object with extra properties", () => {
            const result = validateMessage({
                playerName: "Alice",
                message: "Hello",
                extraField: "ignored"
            });

            expect(result).toEqual({
                playerName: "Alice",
                message: "Hello"
            });
            expect(result.extraField).toBeUndefined();
        });
    });
});
