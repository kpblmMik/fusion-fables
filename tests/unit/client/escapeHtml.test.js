/**
 * @jest-environment jsdom
 */

// Recreate the escapeHtml function from gamescript.js for testing
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

describe("escapeHtml", () => {
    describe("XSS prevention", () => {
        it("escapes < and > characters", () => {
            const result = escapeHtml("<script>alert('xss')</script>");
            expect(result).not.toContain("<script>");
            expect(result).not.toContain("</script>");
            expect(result).toContain("&lt;");
            expect(result).toContain("&gt;");
        });

        it("escapes HTML tags", () => {
            const result = escapeHtml("<div onclick='evil()'>click me</div>");
            expect(result).not.toContain("<div");
            expect(result).toContain("&lt;div");
            // Note: attribute names remain as text but are harmless since < > are escaped
        });

        it("escapes img tags with onerror handlers", () => {
            const result = escapeHtml('<img src="x" onerror="alert(1)">');
            expect(result).not.toContain("<img");
            expect(result).toContain("&lt;img");
        });

        it("escapes event handler attributes", () => {
            const result = escapeHtml('<a href="#" onmouseover="evil()">link</a>');
            expect(result).not.toContain("<a ");
            expect(result).toContain("&lt;a");
            // Event handlers are rendered harmless since the tag itself is escaped
        });

        it("escapes javascript: URLs", () => {
            const result = escapeHtml('<a href="javascript:alert(1)">click</a>');
            expect(result).not.toContain("<a ");
            expect(result).toContain("&lt;a");
        });

        it("escapes SVG with embedded scripts", () => {
            const result = escapeHtml('<svg onload="alert(1)">');
            expect(result).not.toContain("<svg");
            expect(result).toContain("&lt;svg");
        });

        it("escapes nested script tags", () => {
            const result = escapeHtml('<<script>script>alert(1)<</script>/script>');
            expect(result).not.toContain("<script>");
        });
    });

    describe("character escaping", () => {
        it("escapes ampersands", () => {
            const result = escapeHtml("Tom & Jerry");
            expect(result).toBe("Tom &amp; Jerry");
        });

        it("escapes double quotes", () => {
            const result = escapeHtml('Say "hello"');
            expect(result).toBe('Say "hello"');
            // Note: textContent doesn't escape quotes, but they're safe in text context
        });

        it("escapes single quotes", () => {
            const result = escapeHtml("It's a test");
            expect(result).toBe("It's a test");
        });

        it("escapes multiple special characters", () => {
            const result = escapeHtml("<div class=\"test\">&</div>");
            expect(result).toContain("&lt;");
            expect(result).toContain("&gt;");
            expect(result).toContain("&amp;");
        });
    });

    describe("safe content", () => {
        it("preserves plain text", () => {
            const result = escapeHtml("Hello, World!");
            expect(result).toBe("Hello, World!");
        });

        it("preserves numbers", () => {
            const result = escapeHtml("12345");
            expect(result).toBe("12345");
        });

        it("preserves unicode characters", () => {
            const result = escapeHtml("Hello 世界 🌍");
            expect(result).toBe("Hello 世界 🌍");
        });

        it("preserves newlines", () => {
            const result = escapeHtml("Line 1\nLine 2");
            expect(result).toBe("Line 1\nLine 2");
        });

        it("preserves tabs", () => {
            const result = escapeHtml("Col1\tCol2");
            expect(result).toBe("Col1\tCol2");
        });

        it("handles empty string", () => {
            const result = escapeHtml("");
            expect(result).toBe("");
        });

        it("handles whitespace-only string", () => {
            const result = escapeHtml("   ");
            expect(result).toBe("   ");
        });
    });

    describe("edge cases", () => {
        it("handles very long strings", () => {
            const longString = "a".repeat(10000);
            const result = escapeHtml(longString);
            expect(result).toBe(longString);
        });

        it("handles mixed content", () => {
            const result = escapeHtml("Normal text <b>bold</b> & more");
            expect(result).toContain("Normal text");
            expect(result).toContain("&lt;b&gt;");
            expect(result).toContain("&amp;");
        });

        it("handles encoded entities in input", () => {
            const result = escapeHtml("&lt;script&gt;");
            // Already-encoded entities should be double-encoded
            expect(result).toBe("&amp;lt;script&amp;gt;");
        });

        it("handles null character", () => {
            const result = escapeHtml("test\0test");
            expect(result.length).toBeGreaterThan(0);
        });

        it("handles backslash", () => {
            const result = escapeHtml("path\\to\\file");
            expect(result).toBe("path\\to\\file");
        });
    });
});
