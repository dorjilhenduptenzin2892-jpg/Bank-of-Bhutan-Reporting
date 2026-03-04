export const colors = {
  primary: "#0B2E4E",
  accent: "#1FC8DB",
  success: "#3CB371",
  decline: "#E57373",
  warning: "#FFA726",
  background: "#F4F8FB",
  card: "#FFFFFF",
  dark: {
    background: "#101B2A",
    card: "#18243A",
    text: "#F4F8FB",
    border: "#22304A",
  },
};

export const spacing = (factor: number) => `${factor * 8}px`;

export const typography = {
  pageTitle: { fontSize: "24px", fontWeight: 700 },
  sectionTitle: { fontSize: "18px", fontWeight: 600 },
  kpiNumber: { fontSize: "32px", fontWeight: 700 },
  tableText: { fontSize: "14px", fontWeight: 400 },
};
