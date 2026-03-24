import { atomWithStorage } from "jotai/utils";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { STATUS_FILTER_KEY, CHATBOT_FILTER_KEY } from "./constants";

export const statusFilterAtom = atomWithStorage<string>(STATUS_FILTER_KEY, "all");

export const chatbotFilterAtom = atomWithStorage<
  Id<"chatbots"> | "all"
>(CHATBOT_FILTER_KEY, "all");