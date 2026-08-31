import { CardConfig } from "../src/common/config.js";

/** Baseline config for tests: the two tokens the suite used to put in `process.env`. */
export const testConfig = new CardConfig({
  pats: [
    { name: "PAT_1", value: "dummyPAT1" },
    { name: "PAT_2", value: "dummyPAT2" },
  ],
});
