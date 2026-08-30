export const firebaseConfig = {
  apiKey: "AIzaSyAfqSYNTfmNtI3-fSP7zw0XZojUopQCG0E",
  authDomain: "kgm-conference-2026-399ae.firebaseapp.com",
  projectId: "kgm-conference-2026-399ae",
  storageBucket: "kgm-conference-2026-399ae.firebasestorage.app",
  messagingSenderId: "121226235791",
  appId: "1:121226235791:web:2d25afecd7ba30c5a3c5fa",
};

export const PROGRAM_NAME = "Kingdom Conference 2026";
export const ORG_NAME = "Kingdom Gospel Mission Incorporated";
export const CAPACITY = 1000;

export const BRANCH_GROUPS = [
  {
    region: "Osun State",
    branches: [
      "Zion Assembly (Omi Oko, Isokun, Ilesha)",
      "Faith Assembly (Irojo, Ilesha, Osun State)",
      "Peace Assembly (Imogbara, Osun State)",
      "Agape Assembly (Iwara, Osun State)",
      "Praise Assembly (Isona, Osun State)",
      "Joy Assembly (Osu, Osun State)",
      "Christ the King Assembly (Onigbogi, Ilesha, Osun State)",
      "Divine Mercy Assembly (Ilaje Ile, Ilesha, Osun State)",
      "Covenant Camp Ground (Eweta, Ilesha, Osun State)",
      "Hephzibah Assembly (Oke Omo, Atakumosa West, Ilesha, Osun State)",
    ],
  },
  {
    region: "Kogi State",
    branches: [
      "Anyigba",
      "Abocho",
      "Ajudacha",
      "Ajakolikpa",
      "Ajugbadaligi",
      "Oja Odan",
      "Tajimi",
      "Kpareke",
    ],
  },
];

export const ALL_BRANCHES = BRANCH_GROUPS.flatMap((g) => g.branches);

export function branchRegion(branchName) {
  const grp = BRANCH_GROUPS.find((g) => g.branches.includes(branchName));
  return grp ? grp.region : "Other";
}
