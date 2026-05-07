import { ClipboardEntry } from "@/entries/base";
import { PasteStrategy } from "@/paste/types";

export function execute<T extends ClipboardEntry>(entry: T, strategy: PasteStrategy<T>): Promise<void> {
  if (!strategy.execute) {
    return Promise.reject(new Error(`strategy ${strategy.id} has no execute (group only)`));
  }
  return strategy.execute(entry);
}
