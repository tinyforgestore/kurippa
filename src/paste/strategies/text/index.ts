import { PasteStrategy } from "@/paste/types";
import { ClipboardEntry } from "@/entries/base";
import { plainStrategy } from "@/paste/strategies/text/plain";
import { codeBlockStrategy } from "@/paste/strategies/text/codeBlock";
import { changeCaseStrategy } from "@/paste/strategies/text/changeCase";
import { wrapStrategy } from "@/paste/strategies/text/wrap";
import { joinLinesStrategy } from "@/paste/strategies/text/joinLines";
import { numberLinesStrategy } from "@/paste/strategies/text/numberLines";
import { trimSingleLineStrategy, trimMultiLineStrategy } from "@/paste/strategies/text/trim";

// Unified array. After applicable() filtering:
//   single-line → [plain, codeBlock, changeCase, wrap, trim]
//   multi-line  → [plain, codeBlock, joinLines, numberLines, trimLines]
export const textStrategies: PasteStrategy<ClipboardEntry>[] = [
  plainStrategy,
  codeBlockStrategy,
  changeCaseStrategy,
  wrapStrategy,
  joinLinesStrategy,
  numberLinesStrategy,
  trimSingleLineStrategy,
  trimMultiLineStrategy,
];
