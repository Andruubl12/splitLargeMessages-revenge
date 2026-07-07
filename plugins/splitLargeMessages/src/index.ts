import { findByProps } from "@vendetta/metro";
import { instead, after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";

export { Settings } from "./Settings";

let patches: (() => void)[] = [];

function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function splitMessage(text: string, maxLen: number, byNewlines: boolean): string[] {
    const separator = byNewlines ? "\n" : " ";
    const safeLen = Math.floor(maxLen * 0.95);

    text = text.replace(/\t/g, "    ");

    const longWordRegex = new RegExp(
        `[^${separator === "\n" ? "\\n" : " "}]{${safeLen},}`,
        "g"
    );
    text = text.replace(longWordRegex, (word) => {
        const pieces: string[] = [];
        for (let i = 0; i < word.length; i += safeLen) {
            pieces.push(word.slice(i, i + safeLen));
        }
        return pieces.join(separator);
    });

    const words = text.split(separator);
    const messages: string[] = [];
    let current = "";

    for (const word of words) {
        const candidate = current ? current + separator + word : word;
        if (candidate.length > safeLen) {
            messages.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }
    if (current) messages.push(current);

    let pendingBlock: string | null = null;
    let pendingLine: string | null = null;

    for (let i = 0; i < messages.length; i++) {
        if (pendingBlock) {
            messages[i] = pendingBlock + messages[i];
            pendingBlock = null;
        } else if (pendingLine) {
            messages[i] = pendingLine + messages[i];
            pendingLine = null;
        }

        const blockMatches = messages[i].match(/`{3,}[^\n`]*\n?|`{3,}/g);
        const lineMatches = messages[i].match(/(^|[^`])`{1,2}([^`]|$)/g);

        if (blockMatches && blockMatches.length % 2 === 1) {
            messages[i] += "```";
            pendingBlock = blockMatches[blockMatches.length - 1] + "\n";
        } else if (lineMatches && lineMatches.length % 2 === 1) {
            pendingLine = lineMatches[lineMatches.length - 1].replace(/[^`]/g, "");
            messages[i] += pendingLine;
        }
    }

    return messages.filter(m => m.length > 0);
}

export const onLoad = () => {
    try {
        storage.maxLength ??= 2000;
        storage.byNewlines ??= false;
        storage.delayMs ??= 750;

        const MessageActions = findByProps("sendMessage", "editMessage");
        const MessageLimits = findByProps("MAX_MESSAGE_LENGTH") || findByProps("getNativeCharacterLimit");

        if (MessageLimits) {
            if (MessageLimits.MAX_MESSAGE_LENGTH) {
                Object.defineProperty(MessageLimits, "MAX_MESSAGE_LENGTH", {
                    value: 999999,
                    configurable: true,
                    writable: true
                });
            }
        }

        if (!MessageActions) {
            console.log("[SplitLargeMessages] No se encontró MessageActions");
            return;
        }

        const unpatchSendMessage = instead("sendMessage", MessageActions, (args: any[], orig: (...a: any[]) => any) => {
            const [channelId, message, ...rest] = args;
            const content: string = message?.content ?? "";
            const maxLen = Number(storage.maxLength ?? 2000);
            const byNewlines = !!(storage.byNewlines ?? false);
            const delayMs = Number(storage.delayMs ?? 750);

            if (content.length <= maxLen) {
                return orig(channelId, message, ...rest);
            }

            const chunks = splitMessage(content, maxLen, byNewlines);

            (async () => {
                for (let i = 0; i < chunks.length; i++) {
                    const isLast = i === chunks.length - 1;
                    const chunkMessage = isLast
                        ? { ...message, content: chunks[i] }
                        : { ...message, content: chunks[i], stickerIds: [], validNonShortcutEmojis: [] };

                    await orig(channelId, chunkMessage, ...rest);

                    if (!isLast) await wait(delayMs);
                }
                setTimeout(() => showToast(`Mensaje enviado en ${chunks.length} partes`), 100);
            })();

            return Promise.resolve();
        });

        patches.push(unpatchSendMessage);
        console.log("[SplitLargeMessages] Plugin cargado y límites parchados");
    } catch (e: any) {
        console.error("[SplitLargeMessages] Error en onLoad:", e);
    }
};

export const onUnload = () => {
    for (const unpatch of patches) {
        unpatch();
    }
    patches = [];
};
