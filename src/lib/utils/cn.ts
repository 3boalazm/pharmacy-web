import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
/** shadcn-standard class combiner: clsx + tailwind-merge. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
