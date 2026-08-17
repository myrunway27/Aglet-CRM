import { randomInt } from "node:crypto";

const ADJECTIVES = [
  "Quiet", "Honest", "Curious", "Gentle", "Swift", "Brave", "Clever", "Mellow",
  "Sunny", "Frank", "Keen", "Steady", "Bright", "Calm", "Witty", "Bold",
  "Humble", "Sincere", "Sharp", "Patient", "Vivid", "Earnest", "Plain", "Candid",
];

const ANIMALS = [
  "Falcon", "Otter", "Badger", "Heron", "Lynx", "Marmot", "Puffin", "Fox",
  "Owl", "Ibex", "Wren", "Tapir", "Gecko", "Bison", "Crane", "Mole",
  "Raven", "Stoat", "Finch", "Yak", "Panda", "Seal", "Moose", "Hare",
];

/**
 * Reviews are displayed under the author's pen name — a random, friendly
 * identity ("Quiet Falcon 42") that belongs to the account but has no
 * derivable link to the real person. Users can re-roll it or pick their own.
 */
export function generatePseudonym(): string {
  const adjective = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const animal = ANIMALS[randomInt(ANIMALS.length)];
  const num = randomInt(10, 100);
  return `${adjective} ${animal} ${num}`;
}

export const PEN_NAME_MIN = 3;
export const PEN_NAME_MAX = 30;

// Letters (any language), digits and single spaces; no leading/trailing space.
export function isValidPenName(name: string): boolean {
  if (name.length < PEN_NAME_MIN || name.length > PEN_NAME_MAX) return false;
  if (name !== name.trim() || /\s{2,}/.test(name)) return false;
  return /^[\p{L}\p{N} ]+$/u.test(name);
}
