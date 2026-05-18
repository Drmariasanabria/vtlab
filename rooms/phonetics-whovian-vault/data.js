export const ROOM = {
  id: "phonetics-whovian-vault",
  title: "Phonetics Whovian Vault",
  publicTitle: "Phonetics Time Vault",
  description: "A time-travel-inspired phonetics escape room for IPA transcription, voicing, manner of articulation, and English pronunciation awareness.",
};

export const CHAMBERS = [
  {
    id: "ipa-dad",
    prompt: "Transcribe “dad” in IPA.",
    hint: "Use a broad transcription for a common English pronunciation.",
    answer: "/dæd/",
    accepted: ["dæd", "/dæd/"],
  },
  {
    id: "voicing-d",
    prompt: "Is /d/ voiced or voiceless?",
    hint: "Place your fingers on your throat and imagine producing the sound.",
    answer: "voiced",
    accepted: ["voiced"],
  },
  {
    id: "manner-m",
    prompt: "What is the manner of articulation of /m/?",
    hint: "Air passes through the nose while the lips are closed.",
    answer: "nasal",
    accepted: ["nasal", "nasal stop"],
  },
];
