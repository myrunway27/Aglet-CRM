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
 * A review is displayed under a random pen name generated at posting time.
 * It is stored on the review itself and has no derivable link to the author.
 */
export function generatePseudonym(): string {
  const adjective = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const animal = ANIMALS[randomInt(ANIMALS.length)];
  const num = randomInt(10, 100);
  return `${adjective} ${animal} ${num}`;
}
